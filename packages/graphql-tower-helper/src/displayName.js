export default function displayName(Component) {
  return Component.displayName || Component.name || 'Unknown';
}
