// https://developer.mozilla.org/en/JavaScript_code_modules/Using_JavaScript_code_modules

Components.utils.import ("resource://gre/modules/LightweightThemeManager.jsm");

var EXPORTED_SYMBOLS = [ "PersonaSwitcher" ];

var PersonaSwitcher = new Object();

PersonaSwitcher.firstTime = true;
PersonaSwitcher.timerIsRunning = false;
PersonaSwitcher.debug = false;
PersonaSwitcher.stringBundle;

PersonaSwitcher.prefs =
    Components.classes["@mozilla.org/preferences-service;1"].
    getService (Components.interfaces.nsIPrefService).
    getBranch ("extensions.personaswitcher.");

// needed for addObserver
PersonaSwitcher.prefs.QueryInterface (Components.interfaces.nsIPrefBranch2);

/*
** an observer for changing perferences.
*/
var myObserver =
{
    observe: function (subject, topic, data)
    {
        PersonaSwitcher.log (subject);
        PersonaSwitcher.log (topic);
        PersonaSwitcher.log (data);

        if (topic != "nsPref:changed") return;

        switch (data)
        {
            case "auto":
            {
                if (PersonaSwitcher.prefs.getBoolPref ("auto"))
                    PersonaSwitcher.autoOn (true);
                else
                    PersonaSwitcher.autoOff();
                break;
            }
            case "autominutes":
            {
                PersonaSwitcher.startTimer();
                break;
            }
            case "preview":
            {
                return;    // nothing to do as the value is queried elsewhere
            }
            case "main-menubar":
            case "tools-submenu":
            {
                if (PersonaSwitcher.prefs.getBoolPref (data))
                {
                    PersonaSwitcher.createMenu (data);
                }
                else
                {
                    PersonaSwitcher.removeMenu (data);
                }

                break;
            }
            /*
            {
                PersonaSwitcher.createMenus();
                PersonaSwitcher.removeMenus();
            }
            */
            case "defshift": case "defalt": case "defcontrol":
            case "defmeta": case "defkey":
            case "rotshift": case "rotalt": case "rotcontrol":
            case "rotmeta": case "rotkey":
            case "autoshift": case "autoalt": case "autocontrol":
            case "autometa": case "autokey":
            {
                PersonaSwitcher.setKeyset();
                break;
            }
            default:
            {
                PersonaSwitcher.log (data);
            }
        }
    }
}

PersonaSwitcher.prefs.addObserver ("", myObserver, false);

PersonaSwitcher.timer = Components.classes["@mozilla.org/timer;1"]
    .createInstance(Components.interfaces.nsITimer);

PersonaSwitcher.startTimer = function()
{
    PersonaSwitcher.log();

    if (! PersonaSwitcher.prefs.getBoolPref ("auto")) return;

    if (PersonaSwitcher.timerIsRunning) PersonaSwitcher.timer.cancel();

    var minutes = PersonaSwitcher.prefs.getIntPref ("autominutes");

    if (minutes > 0)
    {
        PersonaSwitcher.timerIsRunning = true;
        PersonaSwitcher.timer.init
        (
            PersonaSwitcher.rotate,
            1000 * 60 * minutes,
            Components.interfaces.nsITimer.TYPE_REPEATING_SLACK
        );
    }
}

PersonaSwitcher.autoOff = function()
{
    PersonaSwitcher.log();

    if (PersonaSwitcher.timerIsRunning) PersonaSwitcher.timer.cancel();

    PersonaSwitcher.prefs.setBoolPref ("auto", 0);
}

PersonaSwitcher.autoOn = function (doRotate)
{
    PersonaSwitcher.log();

    PersonaSwitcher.startTimer();
    PersonaSwitcher.prefs.setBoolPref ("auto", 1);

    if (doRotate) PersonaSwitcher.rotate();
}

PersonaSwitcher.toggleAuto = function()
{
    PersonaSwitcher.log();

    if (PersonaSwitcher.prefs.getBoolPref ("auto"))
    {
        PersonaSwitcher.autoOff();
    }
    else
    {
        PersonaSwitcher.autoOn (true);
    }
}

PersonaSwitcher.switchTo = function (toWhich)
{
    /*
    ** http://www.idealog.us/2007/02/check_if_a_java.html
    */
    if (typeof LightweightThemeManager.themeChanged != 'function')
    {
        LightweightThemeManager.currentTheme = toWhich;
    }
    else
    {
        // 3.* compatability
        LightweightThemeManager.themeChanged (toWhich);
    }
}

PersonaSwitcher.rotate = function()
{
    PersonaSwitcher.log();

    var arr = LightweightThemeManager.usedThemes;

    if (arr.length < 1) return;

    PersonaSwitcher.switchTo (arr[arr.length-1]);
}

PersonaSwitcher.previous = function()
{
    PersonaSwitcher.log();

    var arr = LightweightThemeManager.usedThemes;

    if (arr.length < 1) return;

    PersonaSwitcher.switchTo (arr[1]);
}

/*
** if the user pressed the rotate keyboard command, rotate and
** reset the timer.
*/
PersonaSwitcher.rotateKey = function()
{
    PersonaSwitcher.log();

    PersonaSwitcher.rotate();
    PersonaSwitcher.startTimer();
}

PersonaSwitcher.setDefault = function()
{
    PersonaSwitcher.log();

    if (LightweightThemeManager.currentTheme != null)
        PersonaSwitcher.switchTo (null);

    PersonaSwitcher.autoOff();
}

PersonaSwitcher.onMenuItemCommand = function (which)
{
    PersonaSwitcher.log();

    PersonaSwitcher.switchTo (which);
    PersonaSwitcher.startTimer();
}

PersonaSwitcher.migratePrefs = function()
{
    var oldPrefs =
        Components.classes["@mozilla.org/preferences-service;1"].
        getService (Components.interfaces.nsIPrefService).
        getBranch ("extensions.themeswitcher.");

    var kids = oldPrefs.getChildList ("", {});

    if (kids.length == 0) return;

    for (var i in kids)
    {
        var type = oldPrefs.getPrefType (kids[i]);
        PersonaSwitcher.log (kids[i]);

        switch (type)
        {
            case oldPrefs.PREF_STRING:
            {
                PersonaSwitcher.prefs.setCharPref (kids[i],
                    oldPrefs.getCharPref (kids[i]));
                break;
            }
            case oldPrefs.PREF_INT:
            {
                PersonaSwitcher.prefs.setIntPref (kids[i],
                    oldPrefs.getIntPref (kids[i]));
                break;
            }
            case oldPrefs.PREF_BOOL:
            {
                PersonaSwitcher.prefs.setBoolPref (kids[i],
                    oldPrefs.getBoolPref (kids[i]));
                break;
            }
        }
    }
    oldPrefs.deleteBranch ("");
}

PersonaSwitcher.log = function()
{
    if (! PersonaSwitcher.debug)
        return;

    var message = "";

    try
    {
        this.undef();
    }
    catch (e)
    {
        var frames = e.stack.split ("\n");
        message += frames[1].replace ('()@resource://', '') + ": ";
    }

    for (var a in arguments)
    {
        message += arguments[a];
    }

    dump (message + "\n");

    // var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
    // .getService(Components.interfaces.nsIConsoleService);
    // consoleService.logStringMessage(message);
}