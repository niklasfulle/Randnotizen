function getPanelBounds(workArea, panelWidth, side = 'right') {
  const isRight = side !== 'left';
  return {
    x: isRight ? workArea.x + workArea.width - panelWidth : workArea.x,
    y: workArea.y,
    width: panelWidth,
    height: workArea.height,
  };
}

function resolveDisplay(displays, preferredDisplayId, primaryDisplay) {
  if (preferredDisplayId && preferredDisplayId !== 'primary') {
    const preferred = displays.find((display) => String(display.id) === String(preferredDisplayId));
    if (preferred) return preferred;
  }
  return primaryDisplay;
}

module.exports = { getPanelBounds, resolveDisplay };
