export type Card = {
  /** Liten etikett över rubriken, med en tunn linje ovanför. */
  label?: string;
  heading: string;
  text?: string;
  /**
   * Punktlista i stället för brödtext. En sträng blir en rad i monospace;
   * ett objekt ger namnet i monospace med en förklaring under.
   */
  items?: (string | { name: string; text: string })[];
};

export type AnatomyData = {
  /** Kodblocket, rad för rad. */
  code: string;
  /** Etiketterna till höger. `line` är radens nollbaserade index i code. */
  notes: { line: number; tag: string; heading: string; text?: string }[];
};

export type GraphNode = {
  id: string;
  /** Kolumn i grafen: 0 vänster, 1 mitten, 2 höger. */
  column: number;
  label?: string;
  heading: string;
  text?: string;
  /** Korta punkter under brödtexten. Passar noden som bär mest. */
  points?: string[];
  /** Id:n noden kopplas till. Linjen dras när båda ändarna står på plats. */
  links?: string[];
  /** Byggsteget då noden kommer fram, och markeras. 1 = första klicket. */
  step: number;
  /**
   * Ger noden mer tyngd — större ruta och text. Storleken sätts med padding och
   * typsnittsgrad, aldrig med transform: länkarnas fästen mäts med offsetWidth
   * och skulle annars sitta kvar på den oskalade kanten.
   */
  large?: boolean;
};

export type GraphData = { nodes: GraphNode[] };

export type Shot = {
  src: string;
  alt: string;
  heading?: string;
  text?: string;
};

export type Slide = {
  /** Liten etikett ovanför rubriken, t.ex. "03 / Avsnittsnamn". */
  chapter: string;
  /** Rubrik. Radbryt med \n — andra raden får en egen färg via .second-line. */
  title: string;
  /** Ingress. */
  body?: string;
  /** Mindre kompletterande text under ingressen. */
  detail?: string;
  /** Numrerad lista. */
  steps?: string[];
  /** Två textblock bredvid varandra. */
  columns?: { heading: string; text: string }[];
  /** Startbild utan chrome — bara en stor knapp som går vidare. */
  intro?: boolean;
  /** Titelbild: större rubrik, kortare radlängd. */
  cover?: boolean;
  /**
   * Sätter rubrikens rader på en rad i stället för under varandra. Radbrytningen
   * i `title` behålls — den är det som ger andra delen sin egen färg.
   */
  inlineTitle?: boolean;
  /**
   * Kort i ett rutnät. De tonar in nerifrån, ett i taget — samma mekanik som
   * Sortera Factory-presentationen. Antalet styr kolumnerna: 2, 3 eller 4 kort
   * får en kolumn var, fler bryts på tre.
   */
  cards?: Card[];
  /**
   * Ritar pilar mellan korten, som visar att de hänger ihop i en kedja.
   * Pilarna kommer efter att alla kort landat — först rutorna, sedan kopplingen.
   */
  linked?: boolean;
  /**
   * Ett kodblock med utpekade delar. Etiketterna ligger till höger och en
   * ledarlinje dras till raden de beskriver. De kommer först på ett klick —
   * sätt `builds: 1` på samma bild.
   */
  anatomy?: AnatomyData;
  /**
   * En nodgraf som byggs upp klick för klick. Varje nod markeras när den kommer
   * och lägger sig sedan bakom när nästa presenteras. Sätt `builds` till högsta
   * step-värdet så håller bilden kvar klicken hela vägen.
   */
  graph?: GraphData;
  /**
   * Skärmbilder som byts på klick, utan att bilden lämnas. Sätt `builds` till
   * antalet bilder minus ett — den första visas redan innan första klicket.
   */
  shots?: Shot[];
  /**
   * Antal klick bilden håller kvar innan den släpper vidare till nästa.
   * Varje klick tar ett byggsteg. 0 eller utelämnad = bilden är klar direkt.
   */
  builds?: number;
  /**
   * Punkternas förklaringar hålls dolda tills första klicket, och tonar då
   * fram i accentfärg medan bakgrunden dämpas. Kräver `builds: 1`.
   */
  revealItems?: boolean;
  /**
   * Fri CSS-klass som sätts på <main> som `<variant>-view`.
   * Använd den när en enskild bild ska se ut på ett eget sätt — då räcker
   * det att skriva CSS, komponenten behöver inte röras.
   */
  variant?: string;
};

/**
 * Bilden som ligger bakom hela presentationen, på varje bild. Sökväg från public/.
 * Sätt till null för ingen bakgrund alls.
 */
//export const backdrop: string | null = '/demo/forefront-5.jpg';

export const backdrop: string | null = 'black-silk-waves.3840x2160.mp4'

export const slides: Slide[] = [
  {
    intro: true,
    chapter: 'Inledning',
    // Introbilden visar bara bakgrunden. Vill du ha en titel över den: skriv den
    // i title, så sätts den stort mitt på. body blir hjälpraden under.
    title: '',
    body: 'Klicka här',
  },
  {
    chapter: 'Intern dragning / 10 minuter',
    title: 'Sortera\nFactory.',
    inlineTitle: true,
    body: 'Designsystemet, recepten och maskinen som reser ett projekt på en minut.',
    builds: 6,
    graph: {
      nodes: [
        {
          id: 'skills',
          column: 0,
          step: 1,
          label: 'sortera-agent-skills',
          heading: 'Recepten',
          text: '25 byggrecept i markdown. Ingenting exekverar.',
          links: ['kit'],
        },
        {
          id: 'hooks',
          column: 0,
          step: 2,
          label: 'sortera-agent-hooks',
          heading: 'Grindarna',
          text: 'Sju skript som alltid körs, oavsett vem som bygger.',
          links: ['kit'],
        },
        {
          id: 'kit',
          column: 1,
          step: 3,
          label: 'sortera-agent-development-kit',
          heading: 'Kitet',
          text: 'Ett repo, en marketplace.json, två plugins med var sin version.',
          points: [
            'Projektet pinnar en tagg i .claude/settings.json',
            'sortera-agent-skills--v0.6.0, aldrig ”senaste”',
          ],
          links: ['factory'],
        },
        {
          id: 'components',
          column: 1,
          step: 4,
          label: '@sortera/*-components',
          heading: 'Designsanningen',
          text: 'Tokens, komponenter och llms-docs i samma artefakt, publicerade som versionerade paket.',
          links: ['factory'],
        },
        {
          id: 'factory',
          column: 2,
          step: 5,
          large: true,
          label: 'sortera-factory',
          heading: 'Maskinen',
          text: 'Reser repo, pipeline och Azure-miljö på en minut.',
          points: [
            'Recepten följer med, så koden skrivs på rätt form från start',
            'Hookarna är monterade före första committen',
            'Repot förklarar sig självt — .ai/ med arkitektur och konventioner följer med',
          ],
          links: ['project'],
        },
        {
          id: 'project',
          column: 3,
          step: 6,
          label: 'lab-container-tracker',
          heading: 'Projektet',
          text: 'Instruktioner, recept och hookar redan monterade. Första committen är produktionsredo.',
        },
      ],
    },
    detail:
      'Recepten säger hur man bygger, designsystemet vad det ska se ut som, hookarna vad som aldrig får hända, och Factory var det landar. Varje del versioneras för sig — projektet pinnar en tagg och följer aldrig ”senaste”.',
  },
  {
    chapter: 'v0.2.0 → v0.6.0',
    title: 'Hur vi\nkom hit.',
    cards: [
      {
        label: '01',
        heading: 'Konventionerna',
        text: 'Läste av Track och CustomerX, skrev ner formen i .ai/.',
      },
      {
        label: '02',
        heading: 'Recepten',
        text: 'Konventionerna blev skills. Receptet bär formen, repot bestämmer innehållet.',
      },
      {
        label: '03',
        heading: 'Marketplacen',
        text: 'Privat Azure DevOps-repo. Projektet pinnar en tagg — ingen kopierar.',
      },
      {
        label: '04',
        heading: 'Splittet',
        text: 'Kitet blev två plugins: markdown skildes från allt som kör.',
      },
      {
        label: '05',
        heading: 'Factory',
        text: 'Projektet, infran och pipelinen reser sig själva ur samma mall.',
      },
    ],
    detail:
      'Varje steg löste ett problem det förra skapade. Recepten behövde en distributionsväg; distributionen avslöjade att markdown och exekverbara hooks inte hör ihop; splittet gjorde det möjligt att resa hela projekt utan att tvinga på dem allt som kör.',
  },
  {
    chapter: 'Kitet',
    title: 'Två plugins,\nett repo.',
    cards: [
      {
        label: 'plugins/skills — v0.6.0',
        heading: 'sortera-agent-skills',
        text: '25 byggrecept i markdown för .NET och React. Ingenting här exekverar — det går att läsa igenom på en eftermiddag.',
      },
      {
        label: 'plugins/hooks — v0.6.0',
        heading: 'sortera-agent-hooks',
        text: 'Sju Node-skript på SessionStart, PreToolUse, PostToolUse och Stop. Blockerar hemligheter, destruktiva kommandon och CI-config på produktionsgren.',
      },
    ],
    detail:
      'Ett repo, en marketplace.json, två oberoende versioner. Splittet gjordes för att delarna har olika förtroendekrav: markdown kan man granska, skript måste man lita på. Nu kan de också ändras i olika takt.',
  },
  {
    chapter: 'Hookarna',
    title: 'Det som\nalltid körs.',
    inlineTitle: true,
    builds: 1,
    revealItems: true,
    cards: [
      {
        label: 'Blockerar',
        heading: 'Grindar som säger nej',
        items: [
          {
            name: 'guard-bash',
            text: 'PreToolUse på Bash — rm -rf på bred sökväg, push --force, --no-verify, commit på skyddad branch, curl | sh',
          },
          {
            name: 'guard-files',
            text: 'PreToolUse på Edit och Write — .env, lockfiler, CI-config, byggoutput, genererade filer, befintliga migrationer',
          },
          {
            name: 'scan-secrets',
            text: 'PostToolUse — credentials i det som just skrevs. Gitleaks om det finns, annars ett mönsterset.',
          },
        ],
      },
      {
        label: 'Observerar — blockerar aldrig',
        heading: 'De som bara rapporterar',
        items: [
          {
            name: 'session-start',
            text: 'SessionStart — listar vilka .ai/*.md och CLAUDE.md som faktiskt finns, så receptens ”läs repots egna dokument först” går att följa. Känner också av stacken.',
          },
          {
            name: 'format',
            text: 'PostToolUse — prettier, biome, eslint --fix, dotnet format. Tyst autofix.',
          },
          {
            name: 'review',
            text: 'PostToolUse — testfilnamn som gör att testet aldrig körs, saknad översättningsnyckel, handlers som inte är internal sealed',
          },
          {
            name: 'report',
            text: 'Stop — allt review hittat rapporteras samlat när turen är slut, inte mitt i arbetet',
          },
        ],
      },
    ],
    detail:
      'Bara säkerhet och destruktiva kommandon blockerar. En hook som blockerar på stil skulle slåss mot repot den sitter i — och det är repot som ska vinna.',
  },
  {
    chapter: 'Ett recept inifrån / new-command-dotnet',
    title: 'Frontmatter, en regel,\nsex steg.',
    inlineTitle: true,
    body: 'En markdown-fil. Så här skapar vi en skill.',
    builds: 1,
    anatomy: {
      code: `---
name: new-command-dotnet
description: Scaffold a new CQRS command +
  handler, wired into Module.cs. Use when...
argument-hint: "{Verb}{Resource}" (e.g. SaveContact)
---

## Scope        repot vinner över receptet
## Steps        sex steg, kodmall per steg
## Done when    filerna + registreringen finns
## Output       vad agenten ska rapportera`,
      notes: [
        {
          line: 1,
          tag: 'Frontmattern',
          heading: 'Gör receptet valbart',
          text: 'name och description är vad agenten läser för att avgöra om receptet passar uppgiften.',
        },
        {
          line: 4,
          tag: 'Argumenten',
          heading: 'Hålen som ska fyllas',
          text: '{Verb}{Resource} är mallens platshållare. SaveContact blir SaveContactCommandHandler.',
        },
        {
          line: 7,
          tag: 'Scope',
          heading: 'Repot vinner över receptet',
          text: 'Krockar receptets form med projektets egna konventioner är det projektet som gäller.',
        },
        {
          line: 8,
          tag: 'Steps',
          heading: 'Sex steg, en mall per steg',
          text: 'Varje steg bär en kodmall med hål i, i den ordning de ska utföras.',
        },
      ],
    },
    detail:
      'Ingenting här exekverar. Ett recept är en beskrivning av formen — det är hookarna som håller i grindarna och agenten som skriver koden.',
  },
  {
    chapter: 'Factory / elva steg, ~1 minut',
    title: 'Ett formulär in,\nett projekt ut.',
    cards: [
      {
        label: 'Steg 1–3',
        heading: 'Diagnostik',
        text: 'Namnregler, MVP-motivering, tenant-koll och kollisionsprechecks. Inget skapas.',
      },
      {
        label: 'Steg 4–6',
        heading: 'Azure',
        text: 'Resursgrupp, deployer- och pull-identitet, service connection med federerad credential.',
      },
      {
        label: 'Steg 7–10',
        heading: 'Azure DevOps',
        text: 'Variable group, repo, mallkod på main + dev, pipeline med behörigheter.',
      },
      {
        label: 'Steg 11',
        heading: 'Sammanfattning',
        text: 'Klonlänk och nästa steg. Samma mall reser test och prod.',
      },
    ],
    detail:
      'Azure-arbetet ligger först med flit: allt som kan fela på en behörighet ligger ovanför steget som skapar repot. Ett mjukraderat repo behåller nämligen sitt namn och blockerar nästa försök tills det tömts ur papperskorgen.',
  },
  {
    chapter: 'I praktiken',
    title: 'Tre bilder\nur verkligheten.',
    inlineTitle: true,
    builds: 2,
    shots: [
      {
        src: '/demo/shot-marketplace.webp',
        alt: 'Claude Code lägger till marketplacen och installerar pluginet',
        heading: 'Marketplacen',
        text: 'Ett privat repo i SorteraOne/Sortera Lab. Projektet pinnar sedan en tagg i .claude/settings.json — sortera-agent-skills--v0.6.0, inte ”senaste”.',
      },
      {
        src: '/demo/shot-session.webp',
        alt: 'Första sessionen i ett Factory-genererat projekt',
        heading: 'Första sessionen',
        text: 'Agenten vet redan att det är en POC utan app byggd — den läste det ur projektets egna filer. Projektet har dessutom en egen SessionStart-hook som rapporterar om det delade paketet verkligen laddade: gör det inte det, kör inte heller pluginets hookar, och sessionen ser identisk ut med en fungerande.',
      },
      {
        src: '/demo/shot-azure.webp',
        alt: 'Resursgruppen rg-container-tracker-prod-001 i Azure-portalen',
        heading: 'Azure-miljön',
        text: 'Namnschemat rakt igenom, samma form som Sorteras produktion redan använder. Deployer är Contributor på enbart den här resursgruppen; pull får bara läsa en image ur det delade registret.',
      },
    ],
  },
  {
    chapter: 'Vad som återstår',
    title: 'Så vad nu?',
    body: 'Tre öppna trådar — och gott om utrymme för invändningar.',
    cards: [
      {
        label: 'Design to code',
        heading: 'Designsystemet in i genererade appar',
        text: 'Fjorton tasks, en branch var — pågår. Först måste autentiseringen mot paketet lösas, annars kommer en genererad app inte åt komponenterna.',
      },
      {
        label: 'Prod-tenant',
        heading: 'Promotion till Sorteras produktionstenant',
        text: 'Med test-stage som deploygrind.',
      },
      {
        label: 'Språket',
        heading: 'Verksamhetsspråk i tilltalet',
        text: '”Ska jag lägga upp det?” i stället för push och deploy.',
      },
    ],
  },
];
