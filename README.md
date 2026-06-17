# Online Kalender

Diese Kalender-App laeuft direkt im Browser und enthaelt:

- Wochenansicht mit Uhrzeiten von 07:00 bis 17:00
- Monatsansicht
- Jahresansicht
- Login mit Benutzername und Passwort
- Termin anlegen, bearbeiten und loeschen
- Export und Import als JSON-Datei
- responsive Bedienung fuer PC, iPad und iPhone

## Lokal oeffnen

Die Datei `index.html` im gleichen Ordner kann direkt im Browser geoeffnet werden.

## Auf GitHub Pages hosten

1. Neues GitHub-Repository erstellen, zum Beispiel `online-kalender`.
2. Alle Dateien aus diesem Ordner in das Repository hochladen.
3. In GitHub unter `Settings` -> `Pages` die Quelle `Deploy from a branch`
   waehlen.
4. Branch `main` und Ordner `/root` auswaehlen.
5. Nach kurzer Zeit ist die Seite unter
   `https://DEIN-BENUTZERNAME.github.io/online-kalender/` erreichbar.

## Wichtig zur Synchronisierung

Die aktuelle Version speichert Termine lokal im jeweiligen Browser. Damit PC, iPad
und iPhone automatisch denselben Kalender sehen, muss die App online gehostet und
mit einer echten Datenbank oder einem Kalenderdienst verbunden werden.

GitHub Pages hostet HTML, CSS und JavaScript statisch. Es fuehrt keinen sicheren
Servercode aus und ist deshalb nicht als geschuetzte Kalender-Datenbank geeignet.

Geeignete naechste Optionen:

- Supabase oder Firebase fuer eine eigene Kalender-Datenbank
- Google Calendar oder iCloud Kalender als angebundener Kalenderdienst
- Sites/Cloudflare mit D1-Datenbank fuer eine gehostete Web-App

## Login-Hinweis

Das Passwort wird in der App nicht als Klartext gespeichert, sondern als Hash
geprueft. Bei rein statischem Hosting ist das trotzdem keine vollwertige
Sicherheitsbarriere, weil der gesamte Frontend-Code im Browser sichtbar ist.
