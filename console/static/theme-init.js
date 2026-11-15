// Runs from <head> before first paint (EPSILON-169). Kept as a file, not an inline script, so the
// Content-Security-Policy needs no inline-script allowance.
//
// - data-js: scripts run. The site header folds its links behind the Menu button only then, so
//   with JavaScript off every link stays in view.
// - data-theme (D3a): the theme the visitor picked, otherwise the system's, set before the page
//   paints so it never flashes the other theme. With no pick it follows the system live.
(function () {
	var root = document.documentElement;
	root.setAttribute('data-js', '');

	// The visitor's pick, stored as `ak-theme` only when they choose Light or Dark (src/lib/theme.ts
	// writes it; AudioKit decision 0079). Nothing is stored before that, and nothing else reads the key.
	function stored() {
		try {
			var value = localStorage.getItem('ak-theme');
			return value === 'light' || value === 'dark' ? value : null;
		} catch (e) {
			return null; // Storage blocked: follow the system.
		}
	}

	var light = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
	// The toggle records the pick on <html> as data-theme-choice, so a pick that couldn't be
	// stored still wins over a later change of the system theme.
	function choice() {
		var picked = root.getAttribute('data-theme-choice');
		if (picked === 'light' || picked === 'dark') return picked;
		if (picked === 'system') return null;
		return stored();
	}
	function apply() {
		root.setAttribute('data-theme', choice() || (light && light.matches ? 'light' : 'dark'));
	}
	apply();
	if (light && light.addEventListener) light.addEventListener('change', apply);
})();
