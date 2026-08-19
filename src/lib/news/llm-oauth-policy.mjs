/** Política estática: o que cada provedor autoriza de verdade na API deste app. */

export function subscriptionAuthFor(provider) {
  if (provider === "anthropic") {
    return {
      available: true,
      reason: null,
      hint: "Abre o login oficial da Anthropic (Claude Pro/Max). Cole só o código — vale por poucos minutos.",
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
