export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatLastFirst(full_name: string): string {
  const parts = toTitleCase(full_name).trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`;
}
