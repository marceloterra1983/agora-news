/** Política estática: o que cada provedor autoriza de verdade na API deste app. */

export function subscriptionAuthFor(provider) {
  if (provider === "anthropic") {
    // O login por assinatura só funcionava fingindo ser o Claude Code (client id, user-agent e
    // identidade dele). A assinatura Claude não cobre apps de terceiros: só chave de API.
    return {
      available: false,
      reason:
        "A assinatura Claude (Pro/Max) não autoriza apps de terceiros. Use uma chave de console.anthropic.com.",
    };
  }
  if (provider === "openai") {
    return {
      available: false,
      reason:
        "ChatGPT Plus não autoriza a API de chat deste app. Use uma chave de platform.openai.com.",
    };
  }
  return {
    available: false,
    reason: "A API do Grok aceita só chave. SuperGrok não substitui a API.",
  };
}
