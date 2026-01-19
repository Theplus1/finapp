export function escapeActionForRegex(action: string): string {
  return action.replace(/\./g, '\\.');
}

export function actionWithPayloadRegex(action: string, payloadPattern = '(.+)'): RegExp {
  return new RegExp(`^${escapeActionForRegex(action)}\\.${payloadPattern}$`);
}
