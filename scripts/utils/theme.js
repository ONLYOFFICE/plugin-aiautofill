function isDarkTheme(themeName, themeType) {
    if (themeName && (themeName.indexOf('dark') !== -1 || themeName.indexOf('night') !== -1)) {
        return true;
    }

    if (themeType && (themeType.indexOf('dark') !== -1 || themeType.indexOf('night') !== -1)) {
        return true;
    }

    return false;
}

function buildThemeClasses(themeType, themeName) {
    var classes = [];
    var isDark = isDarkTheme(themeName, themeType);
    
    if (themeName) {
        classes.push(themeName);
    } else if (themeType) {
        classes.push('theme-' + themeType);
    }
    
    if (themeType) {
        classes.push('theme-type-' + themeType);
    }
    
    if (!themeName) {
        classes.push(isDark ? 'theme-dark' : 'theme-light');
    }

    return classes;
}

function updateBodyThemeClasses(themeType, themeName) {
    try {
        var themeClasses = buildThemeClasses(themeType, themeName);
        
        window._currentTheme = { type: themeType, name: themeName };
        
        [document.documentElement, document.body].forEach(function(element) {
            if (!element) return;
            
            themeClasses.forEach(function(className) {
                element.classList.add(className);
            });
            
            var classes = element.className.split(' ');
            classes.forEach(function(className) {
                if (className === 'theme-ready') return;
                if (className.indexOf('theme-') !== -1 && themeClasses.indexOf(className) === -1) {
                    element.classList.remove(className);
                }
            });
        });
    } catch (e) {
        console.error('Error applying theme:', e);
    }
}

function getThemeURLParams() {
    var theme = window._currentTheme;
    if (!theme) return '';
    var params = [];
    if (theme.type) params.push('themeType=' + encodeURIComponent(theme.type));
    if (theme.name) params.push('themeName=' + encodeURIComponent(theme.name));
    return params.length ? '?' + params.join('&') : '';
}

function applyThemeFromURL() {
    try {
        var params = new URLSearchParams(window.location.search);
        var themeType = params.get('themeType');
        var themeName = params.get('themeName');
        
        if (themeType || themeName) {
            var classes = buildThemeClasses(themeType, themeName);
            classes.forEach(function(className) {
                document.documentElement.classList.add(className);
                if (document.body) document.body.classList.add(className);
            });
            return true;
        }
    } catch (e) {}
    return false;
}


function updateThemeVariables(theme) {
    var colorRegex = /^(#([0-9a-f]{3}){1,2}|rgba?\([^\)]+\)|hsl\([^\)]+\))$/i;
    
    var oldStyle = document.getElementById('theme-variables');
    if (oldStyle) {
        oldStyle.remove();
    }
    
    var cssVariables = ':root {\n';
    for (var key in theme) {
        var value = theme[key];
        if (colorRegex.test(value)) {
            var cssKey = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
            cssVariables += '  ' + cssKey + ': ' + value + ';\n';
        }
    }
    
    cssVariables += '}';
    
    var style = document.createElement('style');
    style.id = 'theme-variables';
    style.textContent = cssVariables;
    document.head.appendChild(style);
}

applyThemeFromURL();

window.Autofiller = window.Autofiller || {};
window.Autofiller.getThemeURLParams = getThemeURLParams;