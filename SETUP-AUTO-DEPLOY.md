# Auto-Deploy einrichten (einmalig, 2 Minuten)

Nach diesem Setup kannst du jede Änderung mit **einem einzigen Befehl** rauspushen — egal in welchem Verzeichnis dein Terminal grade ist:

```
cm "kurze beschreibung was du geändert hast"
```

Oder noch kürzer, wenn dir die commit-message egal ist:

```
cm
```

Vercel deployed dann automatisch. Fertig.

---

## Einmalige Einrichtung

Mach das **einmal** in Terminal — danach nie wieder.

### Schritt 1: Alias zur Shell-Config hinzufügen

Tippe in Terminal:

```bash
echo '' >> ~/.zshrc
echo '# ChairMatch — One-Command-Deploy' >> ~/.zshrc
echo 'alias cm="bash \"/Users/work/Chairmatch v1/chairmatch/deploy.sh\""' >> ~/.zshrc
source ~/.zshrc
```

Das war's. Der Alias ist jetzt permanent in deinem Terminal verfügbar.

### Schritt 2: Test

Im Terminal (egal welches Verzeichnis):

```bash
cm
```

Wenn nichts geändert wurde, kommt: `⚠ Nichts zu committen — push entfällt.`
Wenn etwas geändert wurde, läuft die Pipeline automatisch durch.

---

## Was das Script macht

1. **Räumt Git-Locks auf** (das `.git/index.lock`-Problem auf macOS, das uns ständig nervt)
2. **Holt was auf GitHub neu ist** mit `git pull --rebase` — verhindert die `non-fast-forward`-Rejects
3. **Stash schützt deine uncommitted changes** während des Rebases
4. **Commit & Push** in einem Rutsch
5. Zeigt dir am Ende den Vercel-Deploy-Link

---

## Falls mal ein Konflikt kommt

Das Script bricht **sicher** ab und sagt dir was los ist. Dann ist es 2-3 Minuten manuelle Arbeit
(`git status`, Konflikt-Files auflösen, `git add`, `git rebase --continue`). Mit dem aktuellen
Workflow (Solo-Entwickler, ein Branch) wird das aber selten bis nie vorkommen.

---

## Bonus: Noch automatischer geht es nicht

Es gibt theoretisch Tools wie `fswatch`, die bei jedem Datei-Save automatisch committen + pushen.
**Davon rate ich ab** — du würdest dann auch halbfertige Sachen pushen, und Vercel würde 50× am
Tag deployen. Mit `cm` hast du den richtigen Trade-off: bewusster Commit, aber genauso schnell
wie ein Auto-Deploy.
