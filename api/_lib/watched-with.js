export function validWatchedWith(value) {
  return Array.isArray(value)
    && value.length <= 20
    && value.every((username) => typeof username === "string" && username.length > 0 && username.length <= 50)
    && new Set(value).size === value.length;
}