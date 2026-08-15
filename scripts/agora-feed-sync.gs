/**
 * FILA ASSÍNCRONA — AGORA_FEED
 *
 * A coleta horária não entra direto na planilha central.
 * Ela entra numa fila. Um trabalhador drena a fila em lotes.
 *
 *  1. consolidarAgoraFeed
 *     Olha NEWS/AI, acha planilhas YYYY-MM-DD_HH-MM novas
 *     e só ENFILEIRA o id de cada uma. Não lê o conteúdo ainda.
 *
 *  2. processarFila
 *     Tira 5 itens da fila, lê as 5 em paralelo (Sheets API v4),
 *     junta posts novos na AGORA_FEED, marca como visto.
 *     Se o relógio do Apps Script estiver acabando (~4,5 min),
 *     para, guarda o resto da fila e agenda outra rodada em 20s.
 *
 * Por que fila, e não “fazer tudo agora”:
 *  - Apps Script mata o script aos 6 minutos
 *  - Abrir 30 planilhas de uma vez estoura tempo e cota
 *  - Se cair no meio, a fila lembra o que falta — não recomeça do zero
 *
 * A fila mora no cache (queue.jobs). Não é uma Promise do JavaScript:
 * gatilhos do Google não esperam async/await. Continuação = outro
 * disparo de processarFila.
 *
 * Instalar: colar neste projeto → consolidarAgoraFeed → instalarAcionador
 */

const NEWS_AI_FOLDER_ID = "1mScOd7oDx8cTG_aDvdHnlnwwVN8kLMGE";
const FEED_NAME = "AGORA_FEED";
const FEED_ID = "1TAgoz8uXEQy8jHU5Vm7rgkXPc0oxpIzn2C_0jG2THHk";
const OVERLAP_MS = 2 * 60 * 60 * 1000;
const CACHE_TTL = 21600;
const BATCH = 5;
const BUDGET_MS = 4.5 * 60 * 1000;
const MAX_TRIES = 3;
const BACKOFF_BASE_MS = 500;
const BACKOFF_CAP_MS = 16000;
const SHEETS_V4 = "https://sheets.googleapis.com/v4/spreadsheets/";
const RANGE = "A:L";

const PROPS = PropertiesService.getScriptProperties();
const CACHE = CacheService.getScriptCache();

const K = {
  IN_FOLDER: "drive.feedInFolder",
  SHARED: "drive.shared",
  LAST_SYNC: "lastSyncMs",
  ID_SET: "feed.ids",
  SHEET: "sheet.meta.",
  QUEUE: "queue.jobs",
};

const HEADERS = [
  "#",
  "Conta de origem",
  "Data/Hora (UTC)",
  "Data/Hora (São Paulo)",
  "ID do Post",
  "Conteúdo",
  "Tradução (PT-BR)",
  "Síntese (1 linha)",
  "Link do Post",
  "Mídia",
  "Categoria",
  "Imagem",
];

function cacheGet_(key) {
  const hot = CACHE.get(key);
  if (hot != null) return hot;
  const cold = PROPS.getProperty(key);
  if (cold != null) CACHE.put(key, cold, CACHE_TTL);
  return cold;
}

function cachePut_(key, value) {
  CACHE.put(key, value, CACHE_TTL);
  if (value.length < 9000) PROPS.setProperty(key, value);
}

function cacheDel_(key) {
  CACHE.remove(key);
  PROPS.deleteProperty(key);
}

/** Full jitter: 0,5×–1× de min(16s, 500ms × 2^n). */
function backoffMs_(attempt) {
  const n = Math.max(0, Number(attempt) || 0);
  const ceiling = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * Math.pow(2, n));
  return Math.floor(ceiling / 2 + Math.random() * (ceiling / 2));
}

function sleepBackoff_(attempt) {
  const ms = backoffMs_(attempt);
  Logger.log("retry em %sms (tentativa %s)", ms, attempt + 1);
  Utilities.sleep(ms);
}

function oauthToken_() {
  return ScriptApp.getOAuthToken();
}

function sheetsHeaders_() {
  return {
    Authorization: "Bearer " + oauthToken_(),
    "Content-Type": "application/json",
  };
}

function sheetsGetReq_(id) {
  return {
    url: SHEETS_V4 + id + "/values/" + encodeURIComponent(RANGE) + "?majorDimension=ROWS",
    method: "get",
    headers: sheetsHeaders_(),
    muteHttpExceptions: true,
  };
}

function sheetsParseValues_(response) {
  if (response.getResponseCode() !== 200) {
    Logger.log("sheets %s %s", response.getResponseCode(), response.getContentText().slice(0, 180));
    return [];
  }
  const body = JSON.parse(response.getContentText());
  return body.values || [];
}

function sheetsGet_(id) {
  return sheetsParseValues_(UrlFetchApp.fetch(sheetsGetReq_(id).url, sheetsGetReq_(id)));
}

function sheetsGetAll_(ids) {
  if (!ids.length) return [];
  const reqs = ids.map(sheetsGetReq_);
  const res = UrlFetchApp.fetchAll(reqs);
  return res.map(sheetsParseValues_);
}

function sheetMeta_(id) {
  const key = K.SHEET + id;
  const hit = cacheGet_(key);
  if (hit) return JSON.parse(hit);
  const url = SHEETS_V4 + id + "?fields=sheets.properties(sheetId,title)";
  const res = UrlFetchApp.fetch(url, {
    method: "get",
    headers: sheetsHeaders_(),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    throw new Error("meta " + id + " " + res.getResponseCode());
  }
  const props = JSON.parse(res.getContentText()).sheets[0].properties;
  const meta = { sheetId: props.sheetId, title: props.title };
  cachePut_(key, JSON.stringify(meta));
  return meta;
}

function sheetsPrepend_(id, rows) {
  if (!rows.length) return;
  const meta = sheetMeta_(id);
  const insert = {
    requests: [
      {
        insertDimension: {
          range: {
            sheetId: meta.sheetId,
            dimension: "ROWS",
            startIndex: 1,
            endIndex: 1 + rows.length,
          },
          inheritFromBefore: false,
        },
      },
    ],
  };
  const ins = UrlFetchApp.fetch(SHEETS_V4 + id + ":batchUpdate", {
    method: "post",
    headers: sheetsHeaders_(),
    payload: JSON.stringify(insert),
    muteHttpExceptions: true,
  });
  if (ins.getResponseCode() !== 200) {
    throw new Error("insert " + ins.getResponseCode() + " " + ins.getContentText().slice(0, 200));
  }
  const end = 1 + rows.length;
  const range = encodeURIComponent(meta.title + "!A2:L" + end);
  const upd = UrlFetchApp.fetch(
    SHEETS_V4 + id + "/values/" + range + "?valueInputOption=RAW",
    {
      method: "put",
      headers: sheetsHeaders_(),
      payload: JSON.stringify({ range: meta.title + "!A2:L" + end, majorDimension: "ROWS", values: rows }),
      muteHttpExceptions: true,
    },
  );
  if (upd.getResponseCode() !== 200) {
    throw new Error("update " + upd.getResponseCode() + " " + upd.getContentText().slice(0, 200));
  }
}

function sheetsReplace_(id, rows) {
  const meta = sheetMeta_(id);
  const clear = UrlFetchApp.fetch(
    SHEETS_V4 + id + "/values/" + encodeURIComponent(meta.title) + ":clear",
    {
      method: "post",
      headers: sheetsHeaders_(),
      payload: "{}",
      muteHttpExceptions: true,
    },
  );
  if (clear.getResponseCode() !== 200) {
    throw new Error("clear " + clear.getResponseCode());
  }
  const values = [HEADERS].concat(rows);
  const range = meta.title + "!A1:L" + values.length;
  const upd = UrlFetchApp.fetch(
    SHEETS_V4 + id + "/values/" + encodeURIComponent(range) + "?valueInputOption=RAW",
    {
      method: "put",
      headers: sheetsHeaders_(),
      payload: JSON.stringify({ range: range, majorDimension: "ROWS", values: values }),
      muteHttpExceptions: true,
    },
  );
  if (upd.getResponseCode() !== 200) {
    throw new Error("replace " + upd.getResponseCode());
  }
}

function loadIdSet_() {
  try {
    const raw = cacheGet_(K.ID_SET);
    if (!raw) return {};
    const list = JSON.parse(raw);
    const set = {};
    for (var i = 0; i < list.length; i++) set[list[i]] = 1;
    return set;
  } catch (err) {
    return {};
  }
}

function saveIdSet_(set) {
  cachePut_(K.ID_SET, JSON.stringify(Object.keys(set)));
}

function loadQueue_() {
  try {
    const raw = cacheGet_(K.QUEUE);
    const parsed = raw ? JSON.parse(raw) : { jobs: [] };
    return parsed && parsed.jobs ? parsed : { jobs: [] };
  } catch (err) {
    return { jobs: [] };
  }
}

function saveQueue_(queue) {
  try {
    cachePut_(K.QUEUE, JSON.stringify(queue));
  } catch (err) {
    Logger.log("saveQueue %s", err);
  }
}

function jobKey_(job) {
  return job.id + "." + job.stamp;
}

function listHourlyJobs_(sinceMs) {
  const jobs = [];
  try {
    const query =
      "'" +
      NEWS_AI_FOLDER_ID +
      "' in parents and mimeType = 'application/vnd.google-apps.spreadsheet'" +
      (sinceMs ? " and modifiedDate > '" + toDriveDate_(sinceMs) + "'" : "");
    const files = DriveApp.searchFiles(query);
    while (files.hasNext()) {
      try {
        const file = files.next();
        const id = file.getId();
        const name = file.getName();
        if (name === FEED_NAME || id === FEED_ID) continue;
        if (!/^\d{4}-\d{2}-\d{2}_/.test(name)) continue;
        const stamp = file.getLastUpdated().getTime();
        if (CACHE.get("seen." + id + "." + stamp)) continue;
        jobs.push({ id: id, name: name, stamp: stamp, tries: 0 });
      } catch (err) {
        Logger.log("list item %s", err);
      }
    }
  } catch (err) {
    Logger.log("listHourly %s", err);
  }
  return jobs;
}

function enqueueChanged_() {
  const queue = loadQueue_();
  const have = {};
  for (var i = 0; i < queue.jobs.length; i++) have[jobKey_(queue.jobs[i])] = 1;
  const since = Number(cacheGet_(K.LAST_SYNC) || 0);
  const cutoff = since > 0 ? since - OVERLAP_MS : 0;
  const listed = listHourlyJobs_(cutoff);
  var added = 0;
  for (var j = 0; j < listed.length; j++) {
    const key = jobKey_(listed[j]);
    if (have[key]) continue;
    queue.jobs.push(listed[j]);
    have[key] = 1;
    added++;
  }
  saveQueue_(queue);
  return { queue: queue, added: added };
}

function consumeBatch_(jobs) {
  if (!jobs.length) return { wrote: 0, failed: [] };
  var tables;
  try {
    tables = sheetsGetAll_(
      jobs.map(function (job) {
        return job.id;
      }),
    );
  } catch (err) {
    Logger.log("batch fetch %s", err);
    return { wrote: 0, failed: jobs };
  }
  const known = loadIdSet_();
  const fresh = [];
  const failed = [];
  for (var i = 0; i < jobs.length; i++) {
    try {
      const parsed = parseTable_(tables[i] || []);
      for (var p = 0; p < parsed.length; p++) {
        if (!parsed[p].id || known[parsed[p].id]) continue;
        fresh.push(parsed[p].row);
        known[parsed[p].id] = 1;
      }
      CACHE.put("seen." + jobKey_(jobs[i]), "1", CACHE_TTL);
    } catch (err) {
      Logger.log("parse %s %s", jobs[i].name || jobs[i].id, err);
      jobs[i].tries = (jobs[i].tries || 0) + 1;
      if (jobs[i].tries < MAX_TRIES) failed.push(jobs[i]);
    }
  }
  if (fresh.length) {
    try {
      for (var r = 0; r < fresh.length; r++) fresh[r][0] = r + 1;
      sheetsPrepend_(FEED_ID, fresh);
      saveIdSet_(known);
    } catch (err) {
      Logger.log("prepend %s", err);
      const retry = jobs.filter(function (job) {
        job.tries = (job.tries || 0) + 1;
        return job.tries < MAX_TRIES;
      });
      return { wrote: 0, failed: retry.concat(failed) };
    }
  }
  return { wrote: fresh.length, failed: failed };
}

function clearDrainTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "processarFila") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function scheduleDrain_() {
  clearDrainTriggers_();
  ScriptApp.newTrigger("processarFila").timeBased().after(20 * 1000).create();
}

function processarFila() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) {
    Logger.log("fila: lock — outra rodada");
    return;
  }
  const t0 = Date.now();
  try {
    if (cacheGet_(K.IN_FOLDER) !== FEED_ID) {
      ensureFeedInFolder_(DriveApp.getFolderById(NEWS_AI_FOLDER_ID));
    }
    var queue = loadQueue_();
    var wrote = 0;
    while (queue.jobs.length && Date.now() - t0 < BUDGET_MS) {
      const batch = queue.jobs.splice(0, BATCH);
      saveQueue_(queue);
      const result = consumeBatch_(batch);
      wrote += result.wrote;
      if (result.failed.length) {
        var worst = 1;
        result.failed.forEach(function (job) {
          worst = Math.max(worst, job.tries || 1);
        });
        sleepBackoff_(worst - 1);
        queue = loadQueue_();
        queue.jobs = result.failed.concat(queue.jobs);
        saveQueue_(queue);
        Logger.log("refila %s", result.failed.length);
      }
      queue = loadQueue_();
    }
    if (queue.jobs.length) {
      scheduleDrain_();
      Logger.log("fila: +20s rest=%s wrote=%s %sms", queue.jobs.length, wrote, Date.now() - t0);
      return;
    }
    clearDrainTriggers_();
    cachePut_(K.LAST_SYNC, String(Date.now()));
    if (cacheGet_(K.SHARED) !== FEED_ID) {
      ensurePublic_(DriveApp.getFileById(FEED_ID));
    }
    Logger.log("fila: vazia wrote=%s %sms", wrote, Date.now() - t0);
  } catch (err) {
    Logger.log("processarFila %s", err);
    try {
      scheduleDrain_();
    } catch (err2) {
      Logger.log("não reagendou %s", err2);
    }
  } finally {
    lock.releaseLock();
  }
}

function consolidarAgoraFeed() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) {
    Logger.log("lock — sai");
    return;
  }
  try {
    if (cacheGet_(K.IN_FOLDER) !== FEED_ID) {
      ensureFeedInFolder_(DriveApp.getFolderById(NEWS_AI_FOLDER_ID));
    }
    const enq = enqueueChanged_();
    Logger.log("fila: +%s total=%s", enq.added, enq.queue.jobs.length);
  } catch (err) {
    Logger.log("consolidarAgoraFeed %s", err);
  } finally {
    lock.releaseLock();
  }
  try {
    processarFila();
  } catch (err) {
    Logger.log("processarFila chamada %s", err);
  }
}

function parseTable_(values) {
  if (!values || values.length < 2) return [];
  const header = values[0].map(function (c) {
    return String(c).trim();
  });
  const width = header.length;
  const idx = HEADERS.map(function (name, i) {
    const found = header.indexOf(name);
    return found >= 0 ? found : i < width ? i : -1;
  });
  const idAt = idx[4];
  if (idAt < 0) return [];
  const out = [];
  for (var r = 1; r < values.length; r++) {
    const raw = values[r];
    const id = String(raw[idAt] || "").replace(/\D/g, "");
    if (!id) continue;
    const row = idx.map(function (col) {
      return col >= 0 && raw[col] != null ? raw[col] : "";
    });
    while (row.length < HEADERS.length) row.push("");
    if (!row[10]) row[10] = "ai";
    out.push({ id: id, row: row });
  }
  return out;
}

function rebuildFromScratch() {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    cacheDel_(K.ID_SET);
    cacheDel_(K.LAST_SYNC);
    saveQueue_({ jobs: listHourlyJobs_(0) });
  } finally {
    lock.releaseLock();
  }
  processarFila();
}

function ensureFeedInFolder_(folder) {
  var file;
  try {
    file = DriveApp.getFileById(FEED_ID);
  } catch (err) {
    file = findByName_(folder) || findInRoot_() || createInFolder_(folder);
  }
  if (!isInFolder_(file, NEWS_AI_FOLDER_ID)) moveInto_(file, folder);
  cachePut_(K.IN_FOLDER, file.getId());
  return file;
}

function findByName_(folder) {
  const it = folder.getFilesByName(FEED_NAME);
  return it.hasNext() ? it.next() : null;
}

function findInRoot_() {
  const it = DriveApp.searchFiles(
    "title = '" +
      FEED_NAME +
      "' and 'root' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
  );
  return it.hasNext() ? it.next() : null;
}

function createInFolder_(folder) {
  const ss = SpreadsheetApp.create(FEED_NAME);
  const file = DriveApp.getFileById(ss.getId());
  moveInto_(file, folder);
  sheetsReplace_(file.getId(), []);
  cacheDel_(K.SHEET + file.getId());
  return file;
}

function isInFolder_(file, folderId) {
  if (cacheGet_(K.IN_FOLDER) === file.getId()) return true;
  const parents = file.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === folderId) {
      cachePut_(K.IN_FOLDER, file.getId());
      return true;
    }
  }
  return false;
}

function moveInto_(file, folder) {
  if (isInFolder_(file, folder.getId())) return;
  try {
    file.moveTo(folder);
  } catch (err) {
    folder.addFile(file);
    const parents = file.getParents();
    while (parents.hasNext()) {
      const parent = parents.next();
      if (parent.getId() !== folder.getId()) {
        try {
          parent.removeFile(file);
        } catch (err2) {}
      }
    }
  }
  cachePut_(K.IN_FOLDER, file.getId());
}

function ensurePublic_(file) {
  if (cacheGet_(K.SHARED) === file.getId()) return;
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    cachePut_(K.SHARED, file.getId());
  } catch (err) {
    Logger.log("share %s", err);
  }
}

function toDriveDate_(ms) {
  return Utilities.formatDate(new Date(ms), "UTC", "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

function instalarAcionador() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "consolidarAgoraFeed") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger("consolidarAgoraFeed").timeBased().everyHours(1).create();
}

function limparCacheDrive() {
  cacheDel_(K.IN_FOLDER);
  cacheDel_(K.SHARED);
  cacheDel_(K.LAST_SYNC);
  cacheDel_(K.ID_SET);
  cacheDel_(K.QUEUE);
  cacheDel_(K.SHEET + FEED_ID);
  clearDrainTriggers_();
}

function resetarCacheSync() {
  limparCacheDrive();
}
