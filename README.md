# Presentationsskelett

Ett tomt startprojekt för webbpresentationer. All navigation fungerar — tangentbord,
swipe, helskärm, djuplänkar och tidslinje — men det finns inget visuellt innehåll.
Kopiera mappen när du börjar en ny presentation.

## Kom igång

```bash
npm install
npm run dev      # startar och öppnar webbläsaren
npm run build    # typkollar och bygger till dist/
```

## Lägga till en bild

Allt innehåll ligger i `src/slides.ts`. Lägg till ett objekt i `slides`-arrayen:

```ts
{
  chapter: '07 / Avsnittsnamn',   // liten etikett ovanför rubriken
  title: 'Rubrik på\ntvå rader',  // \n bryter raden, rad 2 får egen färg
  body: 'Ingressen som bär huvudbudskapet.',
  detail: 'Mindre, dämpad text under ingressen.',
}
```

Ordningen i arrayen är ordningen i presentationen. Sidfotens räknare och tidslinje
uppdaterar sig själva.

### Fält

| Fält | Vad det gör |
| --- | --- |
| `chapter` | Etiketten ovanför rubriken |
| `title` | Rubriken. `\n` ger radbrytning, andra raden får `.second-line` |
| `body` | Ingress |
| `detail` | Mindre kompletterande text |
| `steps` | Sträng-array som blir en numrerad lista |
| `columns` | `{ heading, text }[]` som blir textblock bredvid varandra |
| `cards` | `{ label?, heading, text?, items? }[]` som blir ett rutnät av kort |
| `linked` | Ritar pilar mellan korten — kedjan visas efter att rutorna landat |
| `graph` | Nodgraf i tre kolumner som byggs upp klick för klick, med länkar |
| `anatomy` | Kodblock med etiketter till höger och ledarlinjer till raderna |
| `builds` | Antal klick bilden håller kvar innan den släpper vidare |
| `intro` | Startbild utan chrome, bara en knapp som går vidare |
| `cover` | Titelbild med större rubrik |
| `variant` | Fri CSS-klass, se nedan |

Fälten går att kombinera — `body` + `steps` fungerar, liksom `body` + `columns`.

## Egen layout för en enskild bild

`variant: 'statement'` sätter klassen `.statement-view` på `<main>`. Sedan styr du
utseendet från `src/presentation.css` utan att röra komponenten:

```css
.statement-view .slide-copy { top: 30%; width: 76%; }
```

Två exempel finns redan: `statement` och `questions`.

## Tangentbord

| Tangent | Gör |
| --- | --- |
| `→` `↓` `Mellanslag` `PageDown` | Nästa bild |
| `←` `↑` `PageUp` | Föregående bild |
| `Home` / `End` | Första / sista bilden |
| `F` | Helskärm |
| `R` | Hoppa till start — tryck igen för att komma tillbaka |

På pekskärm bläddrar du genom att dra i sidled.

Aktuell bild ligger i adressen som `#3`, så du kan länka direkt till en bild och
ladda om utan att tappa platsen.

## Tempot i övergången

Den gamla texten tonar ut medan den nya väntar en kort stund och tonar in. Tiderna
ligger i `:root` i `src/presentation.css`:

```css
--fade-out:   620ms;   /* hur länge den gamla texten tonar ut */
--fade-in:    900ms;   /* hur länge den nya texten tonar in */
--fade-delay: 380ms;   /* hur länge den nya väntar innan den startar */
```

Höj alla tre för ett lugnare tempo. Höjer du `--fade-out` måste `EXIT_MS` överst i
`Presentation.tsx` höjas lika mycket — det är den som styr när den utgående texten
plockas bort ur DOM:en.

Ut ur introbilden dyker kameran in i bilden: texten rusar förbi och bakgrunden går
från `--backdrop-intro` till `--backdrop-rest`, båda inåt. Bakåt in i intron går
samma rörelse omvänt.

Två bilder korsas bara när de har samma layout. Byter du till en bild med annan
`variant`, eller till `cover`, hoppar den nya in utan korsning — annars skulle den
gamla texten flytta sig till den nya bildens position mitt i uttoningen.

## Kort

`cards` ger ett rutnät där korten tonar in nerifrån, ett i taget:

```ts
{
  chapter: 'Kartan',
  title: 'Fyra repon,\nen kedja.',
  cards: [
    { label: 'sortera-agent-skills', heading: 'Recepten', text: '25 byggrecept som markdown.' },
    { label: 'sortera-agent-hooks', heading: 'Grindarna', text: 'Åtta skript som alltid körs.' },
  ],
  detail: 'Bildtexten hamnar under korten.',
}
```

Antalet kort styr kolumnerna: 2 kort ger två kolumner, 4 ger fyra, allt annat tre.
`items` byter ut brödtexten mot en punktlista i monospace — bra för uppräkningar.
`detail` hamnar under rutnätet och fungerar som bildtext.

Kaskaden styrs av två variabler i `:root`:

```css
--card-in: 650ms;       /* hur länge ett kort tonar in */
--card-stagger: 90ms;   /* förskjutningen mellan korten */
```

Kaskaden startar efter `--fade-delay`, så korten kommer när rubriken redan är på plats.

`linked: true` sätter en pil i varje mellanrum, så rutnätet läses som en kedja. Pilarna
tonar in först när sista kortet landat — man ser rutorna, sedan hur de hänger ihop.
På smal skärm ligger korten under varandra och pilen pekar neråt i stället.

```css
--link-in: 520ms;   /* hur länge en pil tonar in */
--link-lead: …      /* när första pilen startar — default: när sista kortet landat */
```

## Nodgraf — bygg upp ett samband

`graph` ritar kort i tre kolumner och länkar mellan dem. Varje nod har ett `step`,
och kommer fram vid det klicket:

```ts
{
  chapter: 'Kartan',
  builds: 5,
  graph: {
    nodes: [
      { id: 'skills', column: 0, step: 1, label: 'sortera-agent-skills',
        heading: 'Recepten', text: '…', links: ['factory'] },
      { id: 'factory', column: 1, step: 4, heading: 'Maskinen', links: ['project'] },
      { id: 'project', column: 2, step: 5, heading: 'Projektet' },
    ],
  },
}
```

`column` är 0 vänster, 1 mitten, 2 höger; mitten- och högerkolumnen centreras
lodrätt. `links` pekar på id:n — linjen dras när **båda** ändarna står på plats,
så sambandet framträder av sig självt när sista noden kommer.

Sätt `builds` till det högsta `step`-värdet, annars byter bilden innan grafen är
färdig.

**Markeringen.** Det senaste kortet får accentram och ljus bakgrund så budskapet
kommer fram ensamt; när nästa kommer sjunker det till 50 % opacitet och lägger sig
bakom. Tre lägen i CSS: `[data-state='hidden' | 'active' | 'settled']`.

Linjerna ritas som SVG med `pathLength="1"`, vilket gör att samma
`stroke-dashoffset`-övergång ritar en linje av vilken längd som helst. Noderna mäts
med `offsetLeft`/`offsetTop` i stället för `getBoundingClientRect`, så markeringens
transform inte flyttar linjens fästen.

Under 700 px ligger korten i en spalt och länkarna döljs.

## Anatomi — peka ut delar i ett kodblock

`anatomy` visar ett kodblock till vänster och etiketter till höger, med en ritad
ledarlinje från varje etikett till den rad den beskriver:

```ts
{
  chapter: 'Ett recept inifrån',
  title: 'Frontmatter, en regel,\nsex steg.',
  builds: 1,
  anatomy: {
    code: `---\nname: new-command-dotnet\n---`,
    notes: [
      { line: 1, tag: 'Frontmattern', heading: 'Gör receptet valbart', text: '…' },
    ],
  },
}
```

`line` är radens nollbaserade index i `code`. Etiketterna numreras automatiskt.

**Etiketterna kommer på ett klick.** `builds: 1` gör att bilden håller kvar första
klicket: rutan ritas, och först vid nästa klick går du vidare till nästa bild.
Bakåtpilen tar tillbaka byggsteget innan den lämnar bilden. När etiketterna kommer
lägger sig koden i bakgrunden — det är `.anatomy[data-revealed='true'] .anatomy-code`
om du vill dämpa mer eller mindre, eller låta fler element vika undan.

Linjerna ritas på en canvas som mäts om vid fönsterbyte och när typsnitten laddats.
Under 900 px ligger etiketterna under koden och linjerna döljs — de vore obegripliga
i en enda spalt.

`builds` fungerar på vilken bild som helst, inte bara anatomibilder. Vill du bygga
upp något i flera klick höjer du siffran och läser av steget i CSS.

## Bakgrundsbilden

En bild ligger bakom hela presentationen, på varje bild. Den byts på ett ställe,
överst i `src/slides.ts`:

```ts
export const backdrop: string | null = '/demo/forefront-5.jpg';
```

Sätt den till `null` för ingen bakgrund alls. Sökvägen utgår från `public/`.

Motivet dämpas automatiskt så texten håller sig läsbar — temat är mörkt, så ljusa
foton behöver det. Tre reglage i `:root` i `presentation.css`:

```css
--backdrop-opacity: 0.5;   /* hur mycket av motivet som syns */
--backdrop-intro: 1;       /* introbilden — det vidaste läget; under 1 ger fält runt om */
--backdrop-rest: 1.62;     /* viloläget under presentationen — närmare motivet */
```

Gradienten som skuggar ner textspaltens sida sitter i `.backdrop::after`.

Stora foton bör krympas innan de läggs in. `sips -Z 2400 --setProperty formatOptions 70
original.jpg --out public/demo/bild.jpg` tar en 5 MB-fil till några hundra kB.

## Lägga tillbaka det visuella

`<div className="stage" />` i `src/Presentation.tsx` är en tom yta som täcker hela
bilden och ligger bakom texten. Där lägger du illustrationer, en `<canvas>` eller
vad presentationen behöver — läs `slide` för att veta vad som ska visas just nu.

Smalna av textspalten när scenen fylls: `--copy-width` i `:root` i `presentation.css`.
Hela färgtemat ligger i samma block.

## Filer

```
src/
├── slides.ts         innehållet och Slide-typen
├── Presentation.tsx  navigation och rendering
├── presentation.css  layout, typografi, chrome
└── main.tsx          startpunkt
```
