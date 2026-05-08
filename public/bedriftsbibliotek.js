/* ── Company data ────────────────────────────────────────────────────────── */
const COMPANIES = [
  /* ── Eksisterende bedrifter ── */
  {
    id: 'dnb',
    name: 'DNB',
    industry: 'Bank og finans',
    industryKey: 'Bank og finans',
    tagline: 'Norges største finanskonsern',
    employees: '9 000+ ansatte',
    style: 'Strukturert og formelt',
    rounds: 3,
    difficulty: 'Middels',
    description: 'DNB er Norges største finanskonsern. Intervjuprosessen er systematisk og kompetansebasert. HR gjennomfører en innledende telefonsamtale, deretter møter du faglig leder, og en tredje runde med praktisk case-oppgave er vanlig for fagstillinger.',
    questions: [
      'Fortell om en gang du tok en viktig beslutning under press.',
      'Hva vet du om DNBs digitale strategi og bærekraftsmål?',
      'Beskriv din erfaring med teamarbeid i høytempostillinger.',
    ],
    tips: [
      'Les deg opp på DNBs kvartalstall og strategiplan — de setter pris på kandidater som kjenner selskapet.',
      'Forbered STAR-eksempler (Situasjon, Task, Aksjon, Resultat) for klassiske atferdsspørsmål.',
      'Vis at du forstår regulatoriske krav i finansbransjen — compliance er viktig for DNB.',
    ],
  },
  {
    id: 'equinor',
    name: 'Equinor',
    industry: 'Energi',
    industryKey: 'Energi',
    tagline: 'Ledende globalt energiselskap',
    employees: '22 000+ ansatte',
    style: 'Grundig og kompetansebasert',
    rounds: 4,
    difficulty: 'Krevende',
    description: 'Equinor er et av Norges største selskaper og har en svært strukturert rekrutteringsprosess. Forventer flere runder inkludert tekniske tester, kompetansebaserte intervjuer og panelintervjuer. Prosessen kan ta 2–3 måneder.',
    questions: [
      'Beskriv et prosjekt der du måtte balansere tekniske krav og forretningsmål.',
      'Hvordan forholder du deg til sikkerhet i arbeidshverdagen?',
      'Equinor er i energiomstilling — hva mener du er selskapets største strategiske utfordring?',
    ],
    tips: [
      'Equinor bruker kompetansebaserte intervjuer — ha konkrete eksempler fra tidligere arbeid klare.',
      'Sikkerhet (HMS) er en kjerneverdi. Nevn det gjerne, men vær ekte — de gjennomskuer svar som ikke er autentiske.',
      'Forbered deg på å diskutere energiomstilling og selskapets fornybarambisjonar.',
    ],
  },
  {
    id: 'telenor',
    name: 'Telenor',
    industry: 'Teknologi',
    industryKey: 'Teknologi',
    tagline: 'Nordens ledende teleoperatør',
    employees: '16 000+ ansatte',
    style: 'Profesjonelt med kulturmatch-fokus',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Telenor har en moderne rekrutteringsprosess med fokus på både faglig kompetanse og kulturell match. Første runde er ofte digital, og det er vanlig med en praktisk oppgave eller case mellom runde 1 og 2.',
    questions: [
      'Hvordan holder du deg oppdatert på trender innen teknologi og telekommunikasjon?',
      'Fortell om en gang du leverte et prosjekt med knappe ressurser.',
      'Hva trekker deg til Telenor fremfor andre tech-selskaper?',
    ],
    tips: [
      'Telenor er midt i en digital transformasjon — vis at du er nysgjerrig og endringsvillig.',
      'De vektlegger kulturmatch høyt. Sjekk verdiene deres og koble dem til egne erfaringer.',
      'Forbered deg på spørsmål om kundeopplevelse — de er svært kundeorienterte.',
    ],
  },
  {
    id: 'gjensidige',
    name: 'Gjensidige',
    industry: 'Bank og finans',
    industryKey: 'Bank og finans',
    tagline: 'Norges største forsikringsselskap',
    employees: '3 800+ ansatte',
    style: 'Uformelt og personlig',
    rounds: 2,
    difficulty: 'Enkel',
    description: 'Gjensidige har et relativt uformelt intervjuklima sammenlignet med andre finansaktører. Prosessen er kortere, og de fokuserer mye på personlighet og motivasjon. To runder er normalt — en innledende samtale og en dybderunde med leder.',
    questions: [
      'Hva motiverer deg til å jobbe i forsikringsbransjen?',
      'Beskriv en situasjon der du måtte snu en misfornøyd kunde.',
      'Hva er din tilnærming til å bygge relasjoner med kollegaer?',
    ],
    tips: [
      'Gjensidige verdsetter ektehet og personlighet — vær deg selv og unngå å være for formell.',
      'Vis kunnskap om forsikringsmarkedet i Norge og Gjensidiges posisjon i det.',
      'Fremhev relasjonelle egenskaper — de jobber svært kundenært.',
    ],
  },
  {
    id: 'schibsted',
    name: 'Schibsted',
    industry: 'Media',
    industryKey: 'Media',
    tagline: 'Nordisk mediekonsern med sterke merkevarer',
    employees: '5 500+ ansatte',
    style: 'Uformelt og kreativt',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Schibsted er et nordisk mediekonsern med en startup-inspirert kultur. Intervjuene er ofte uformelle og dialogbaserte. De er opptatt av nysgjerrighet, initiativ og evnen til å jobbe i et raskt miljø.',
    questions: [
      'Hvilke norske medier leser du og hvorfor?',
      'Fortell om en idé du kom opp med og gjennomførte på eget initiativ.',
      'Hvordan ser du på fremtiden for betalt digitalt innhold i Norge?',
    ],
    tips: [
      'Schibsted setter pris på kandidater med klare meninger — vær ikke redd for å si hva du mener.',
      'Kjenn til Schibsteds portefølje: VG, Aftenposten, Finn.no m.fl.',
      'Vis at du er interessert i mediebransjen og norsk offentlighet.',
    ],
  },
  {
    id: 'aker',
    name: 'Aker',
    industry: 'Industri',
    industryKey: 'Industri',
    tagline: 'Norsk industri- og investeringskonsern',
    employees: '40 000+ ansatte',
    style: 'Formelt og resultatorientert',
    rounds: 3,
    difficulty: 'Krevende',
    description: 'Aker-konsernet er resultatorientert med høye forventninger. Intervjuene er strukturerte og profesjonelle. De søker kandidater med klar gjennomføringsevne og ambisjoner. Forventer at du kjenner til konsernets selskaper og strategi.',
    questions: [
      'Hva vet du om Akers virksomhetsområder og eierstruktur?',
      'Beskriv en situasjon der du måtte levere resultater under stort press.',
      'Hva er din langsiktige karriereambisjoner?',
    ],
    tips: [
      'Gjør grundig research på Aker-konsernet — de forventer at du kjenner til selskapene de eier.',
      'Vær tydelig på resultater og leveranser du har bidratt med — de er svært resultatorienterte.',
      'Vis at du er ambisiøs og har et langsiktig perspektiv på karrieren.',
    ],
  },
  {
    id: 'kongsberg',
    name: 'Kongsberg Gruppen',
    industry: 'Industri',
    industryKey: 'Industri',
    tagline: 'Høyteknologi innen forsvar og maritim',
    employees: '12 000+ ansatte',
    style: 'Teknisk og grundig',
    rounds: 4,
    difficulty: 'Krevende',
    description: 'Kongsberg Gruppen er et høyteknologisk selskap innen forsvar, maritim og romfart. Intervjuprosessen er grundig og teknisk fokusert. Forventes at du kan diskutere tekniske detaljer og har kunnskap om relevante ingeniørprinsipper.',
    questions: [
      'Beskriv et teknisk prosjekt der du løste et komplekst problem.',
      'Hva vet du om Kongsberg Gruppens produkter og markeder?',
      'Hvordan sikrer du kvalitet og nøyaktighet i teknisk arbeid?',
    ],
    tips: [
      'Kongsberg er et presisjonsorientert selskap — vis at du er nøyaktig og grundig.',
      'Kjennskap til forsvars- og maritim sektor er en stor fordel.',
      'Sikkerhet og eksportkontroll er sentrale temaer — vis bevissthet rundt dette.',
    ],
  },
  {
    id: 'statkraft',
    name: 'Statkraft',
    industry: 'Energi',
    industryKey: 'Energi',
    tagline: 'Europas største produsent av fornybar energi',
    employees: '5 000+ ansatte',
    style: 'Verdiorientert og strukturert',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Statkraft er Europas største produsent av fornybar energi og statlig eid. Intervjuene reflekterer de sterke verdiene om bærekraft og langsiktig tenkning. De er strukturerte og profesjonelle, men med en varm og åpen tone.',
    questions: [
      'Hvorfor ønsker du å jobbe med fornybar energi?',
      'Beskriv et prosjekt der du tok hensyn til bærekraft eller miljø.',
      'Hva tror du er de største hindrene for energiomstillingen i Europa?',
    ],
    tips: [
      'Bærekraft er ikke bare en buzzword hos Statkraft — vis genuin interesse for energiomstilling.',
      'De er statseide og har en trygg, langsiktig kultur. Vis at du passer i en slik organisasjon.',
      'Forbered deg på spørsmål om europeisk energipolitikk og kraftmarkedet.',
    ],
  },
  {
    id: 'yara',
    name: 'Yara',
    industry: 'Industri',
    industryKey: 'Industri',
    tagline: 'Globalt kjemikonsern for matsikkerhet',
    employees: '17 000+ ansatte',
    style: 'Internasjonal og analytisk',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Yara er et globalt kjemikonsern med sterk internasjonal profil. Intervjuene er analytiske og profesjonelle, og engelsk brukes ofte i samtaler. De søker kandidater som trives i globale miljøer og kan jobbe på tvers av kulturer.',
    questions: [
      'Hvordan forholder du deg til å jobbe i et internasjonalt og flerkulturelt miljø?',
      'Beskriv en situasjon der du brukte data til å ta en beslutning.',
      'Hva vet du om global matvaresikkerhet og gjødsels rolle?',
    ],
    tips: [
      'Yara er internasjonalt orientert — fremhev eventuelle globale erfaringer og språkferdigheter.',
      'Analytiske evner vektlegges høyt. Vær klar til å diskutere tall og data.',
      'Kjennskap til landbruk, matsikkerhet eller kjemibransjen er en fordel.',
    ],
  },
  {
    id: 'nhh',
    name: 'NHH',
    industry: 'Utdanning',
    industryKey: 'Utdanning',
    tagline: 'Norges ledende handelshøyskole',
    employees: '700+ ansatte',
    style: 'Akademisk og åpent',
    rounds: 2,
    difficulty: 'Enkel',
    description: 'NHH Norges Handelshøyskole rekrutterer til administrative, faglige og forskerstillinger. Prosessen er transparent med kunngjøringer og åpne søknadsprosesser. Intervjuene er gjerne panel-baserte med representanter fra HR og fagmiljøet.',
    questions: [
      'Hva motiverer deg til å jobbe i akademia eller utdanningssektoren?',
      'Beskriv din erfaring med prosjektledelse eller koordinering.',
      'Hvordan bidrar du til et inkluderende og produktivt arbeidsmiljø?',
    ],
    tips: [
      'Offentlig sektor har transparente prosesser — søk via offentlig utlysningstekst og adress kompetansekravene direkte.',
      'Vis interesse for NHHs faglige og samfunnsmessige rolle.',
      'Panel-intervjuer er vanlig — henvend deg til alle i rommet, ikke bare den som stilte spørsmålet.',
    ],
  },
  {
    id: 'bouvet',
    name: 'Bouvet',
    industry: 'Konsulent',
    industryKey: 'Konsulent',
    tagline: 'Norges best likte IT-konsulentselskap',
    employees: '2 000+ ansatte',
    style: 'Uformelt og faglig',
    rounds: 2,
    difficulty: 'Enkel',
    description: 'Bouvet er et norsk IT-konsulentselskap kjent for sin sterke bedriftskultur og høy trivsel blant ansatte. Intervjuprosessen er gjerne kort og uformell. De er opptatt av at du passer kulturelt og har et godt faglig fundament.',
    questions: [
      'Hva er viktigst for deg i en arbeidsplass?',
      'Beskriv en teknisk utfordring du løste og hva du lærte av det.',
      'Hva er din foretrukne måte å holde deg faglig oppdatert?',
    ],
    tips: [
      'Bouvet scorer konsekvent høyt på medarbeidertilfredshet — de er genuint opptatt av trivsel, og du bør vise det samme.',
      'Faglig nysgjerrighet vektlegges høyt. Vis at du har egne prosjekter eller faglig engasjement utenom jobb.',
      'Konsulentbransjen krever god kommunikasjon — vis at du kan forklare tekniske konsepter enkelt.',
    ],
  },
  {
    id: 'bekk',
    name: 'Bekk',
    industry: 'Konsulent',
    industryKey: 'Konsulent',
    tagline: 'Prisbelønnet norsk tech- og designkonsulent',
    employees: '800+ ansatte',
    style: 'Teknisk og verdidrevet',
    rounds: 3,
    difficulty: 'Krevende',
    description: 'Bekk er et av Norges mest anerkjente IT-konsulentselskaper. De har en krevende rekrutteringsprosess med teknisk test, kulturintervju og fagintervju. De søker eksepsjonelle kandidater som passer den sterke Bekk-kulturen.',
    questions: [
      'Beskriv den mest komplekse tekniske utfordringen du har løst.',
      'Hva er verdiene du ikke er villig til å kompromisse på i arbeidslivet?',
      'Fortell om et prosjekt der du tok faglig eierskap og lederskap.',
    ],
    tips: [
      'Bekk er kjent for høye faglige standarder — sørg for at CV og portefølje er eksemplarisk.',
      'Kulturell match er avgjørende. Les deg opp på Bekks verdier og vær ærlig om hva du ser etter.',
      'Teknisk test er ofte en del av prosessen — øv på algoritmeoppgaver og systemdesign.',
    ],
  },
  {
    id: 'capgemini',
    name: 'Capgemini',
    industry: 'Konsulent',
    industryKey: 'Konsulent',
    tagline: 'Globalt teknologi- og konsulentselskap',
    employees: '340 000+ ansatte',
    style: 'Strukturert med case-intervju',
    rounds: 4,
    difficulty: 'Krevende',
    description: 'Capgemini er et globalt konsulentselskap med sterk norsk tilstedeværelse. Rekrutteringsprosessen er strukturert og internasjonal i stilen. Case-intervjuer er vanlige for konsulentroller. Forventes at du kan strukturere og løse forretningsproblemer.',
    questions: [
      'Beskriv hvordan du ville tilnærmet deg en digital transformasjon for en norsk retailer.',
      'Beskriv en situasjon der du måtte overbevis en skeptisk kunde eller stakeholder.',
      'Hva er ditt syn på fremtiden for konsulentbransjen med AI-fremveksten?',
    ],
    tips: [
      'Case-intervjuer er sannsynlig for mange roller — øv på å strukturere svar med rammeverk som McKinsey-strukturen.',
      'Capgemini opererer globalt — vis at du er komfortabel med internasjonalt samarbeid og gjerne snakker engelsk.',
      'De vektlegger salg og relasjonsbygging — vis kommersielt instinkt.',
    ],
  },
  {
    id: 'visma',
    name: 'Visma',
    industry: 'Teknologi',
    industryKey: 'Teknologi',
    tagline: 'Ledende nordeuropeisk programvareselskap',
    employees: '15 000+ ansatte',
    style: 'Uformelt og kompetansefokusert',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Visma er et nordeuropeisk programvareselskap i sterk vekst. Intervjuprosessen varierer noe mellom de mange Visma-selskapene, men er gjerne uformell og fokusert på faglig kompetanse og eierskap. De verdsetter ambisiøse kandidater.',
    questions: [
      'Beskriv en SaaS-produkt eller funksjon du har vært med å bygge.',
      'Hva er din tilnærming til å prioritere oppgaver i en travel arbeidsdag?',
      'Fortell om en gang du fikk et produkt eller prosjekt over streken trass i hindringer.',
    ],
    tips: [
      'Visma-konsernet er stort og variert — gjør research på det spesifikke Visma-selskapet du søker til.',
      'De liker eierskap og initiativ — vis at du tar ansvar og driver ting selv.',
      'SaaS og produktforståelse er en klar fordel i de fleste roller.',
    ],
  },
  {
    id: 'soprasteria',
    name: 'Sopra Steria',
    industry: 'Konsulent',
    industryKey: 'Konsulent',
    tagline: 'Europeisk IT-konsulent med sterk offentlig-sektor-profil',
    employees: '50 000+ ansatte',
    style: 'Strukturert og profesjonelt',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Sopra Steria er et europeisk IT-konsulentselskap med god norsk forankring. Intervjuprosessen er profesjonell og strukturert. De jobber mye mot offentlig sektor og søker kandidater som er flinke til å kommunisere og samarbeide.',
    questions: [
      'Hva er din erfaring med prosjekter i offentlig sektor?',
      'Beskriv en situasjon der du måtte tilpasse deg raskt til nye krav fra en kunde.',
      'Hvordan sikrer du god kommunikasjon i prosjekter med mange interessenter?',
    ],
    tips: [
      'Sopra Steria jobber mye med offentlig sektor — kjennskap til dette er en fordel.',
      'Kommunikasjon og samarbeidsevner vektlegges høyt — gi konkrete eksempler.',
      'Vis interesse for digitalisering av Norge og det offentlige Norge spesielt.',
    ],
  },

  /* ── Bank og finans ── */
  {
    id: 'norges-bank',
    name: 'Norges Bank',
    industry: 'Bank og finans',
    industryKey: 'Bank og finans',
    tagline: 'Norges sentralbank og pengepolitiske anker',
    employees: '1 100+ ansatte',
    style: 'Akademisk og analytisk',
    rounds: 4,
    difficulty: 'Krevende',
    description: 'Norges Bank er landets sentralbank og forvalter oljefondet (NBIM). Rekrutteringsprosessen er svært krevende og akademisk orientert. Kandidater møter gjerne ekonomer og analytikere på høyt nivå, og skriftlige prøver og case-oppgaver er vanlige.',
    questions: [
      'Hva er din forståelse av pengepolitikkens rolle i å bekjempe inflasjon?',
      'Beskriv en analyse du har gjort basert på et komplekst datasett.',
      'Hvilke makroøkonomiske faktorer mener du påvirker norsk økonomi mest akkurat nå?',
    ],
    tips: [
      'Norges Bank rekrutterer gjerne kandidater med mastergrad eller PhD i økonomi — sterkt akademisk fundament er forventet.',
      'Les sentralbankens pengepolitiske rapporter og forstå norsk rentepolitikk grundig.',
      'Kvantitative ferdigheter og erfaring med econometrics eller dataanalyse er en klar fordel.',
    ],
  },
  {
    id: 'sparebank1',
    name: 'SpareBank 1',
    industry: 'Bank og finans',
    industryKey: 'Bank og finans',
    tagline: 'Norges nest største finanskonsern',
    employees: '6 500+ ansatte',
    style: 'Regionalt og relasjonsorientert',
    rounds: 3,
    difficulty: 'Middels',
    description: 'SpareBank 1-alliansen er Norges nest største finanskonsern med sterk regional forankring. Intervjuene er profesjonelle men med et varmt og personlig preg. Fokus på kundeforhold og lokal kunnskap er gjennomgående.',
    questions: [
      'Hva betyr det for deg å jobbe i en bank med sterke lokale røtter?',
      'Beskriv en situasjon der du hjalp en kunde med et komplisert finansielt spørsmål.',
      'Hva er ditt syn på digital bankutvikling og dens innvirkning på lokale filialer?',
    ],
    tips: [
      'SpareBank 1 verdsetter lokal tilhørighet og kundeorientering — vis at du setter pris på nærhet til kundene.',
      'Forbered deg på spørsmål om produkter som boliglån, sparing og forsikring.',
      'Digital kompetanse kombinert med menneskelig service er nøkkelen — vis begge deler.',
    ],
  },
  {
    id: 'storebrand',
    name: 'Storebrand',
    industry: 'Bank og finans',
    industryKey: 'Bank og finans',
    tagline: 'Ledende innen bærekraftig sparing og forsikring',
    employees: '2 500+ ansatte',
    style: 'Verdiorientert og profesjonelt',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Storebrand er ledende innen bærekraftig investering og forsikring i Norden. Selskapet har satt seg svært ambisiøse bærekraftsmål, og rekrutteringsprosessen reflekterer dette. To til tre intervjurunder med fokus på verdier og faglig kompetanse.',
    questions: [
      'Hva mener du er sammenhengen mellom bærekraft og lønnsomhet i finansbransjen?',
      'Beskriv en situasjon der du måtte formidle kompleks finansiell informasjon til en ikke-ekspert.',
      'Hvordan vil du bidra til Storebrands mål om å være en ansvarlig investor?',
    ],
    tips: [
      'Storebrand er en foregangsaktør innen ESG — vis genuin interesse for bærekraftig finans.',
      'Kjennskap til pensjon og livsforsikring er en fordel for mange roller.',
      'De søker kandidater som er komfortable med forandring og digitalisering av finanstjenester.',
    ],
  },
  {
    id: 'nordea',
    name: 'Nordea',
    industry: 'Bank og finans',
    industryKey: 'Bank og finans',
    tagline: 'Nordens største finanskonsern',
    employees: '28 000+ ansatte',
    style: 'Strukturert og internasjonalt',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Nordea er Nordens største bank og opererer på tvers av fire land. Rekrutteringsprosessen er standardisert og profesjonell. Mange roller krever engelsk, og det er vanlig med online-tester og strukturerte intervjuer.',
    questions: [
      'Hva motiverer deg til å jobbe i en nordisk storbank fremfor en norsk?',
      'Beskriv en erfaring med å navigere i en stor organisasjon med mange interessenter.',
      'Hva er ditt syn på compliance og regulatoriske krav i banksektoren?',
    ],
    tips: [
      'Nordea er en stor og hierarkisk organisasjon — vis at du kan navigere byråkrati og prosesser.',
      'Engelsk er ofte arbeidsspråk — vær forberedt på å intervjue på engelsk.',
      'Online-tester (numerisk, verbal, logisk resonnement) er vanlig tidlig i prosessen.',
    ],
  },

  /* ── Konsulent ── */
  {
    id: 'pwc',
    name: 'PwC',
    industry: 'Konsulent',
    industryKey: 'Konsulent',
    tagline: 'Et av verdens ledende revisjons- og rådgivningsselskaper',
    employees: '2 200+ ansatte i Norge',
    style: 'Strukturert og case-basert',
    rounds: 4,
    difficulty: 'Krevende',
    description: 'PwC er et av de fire store revisjons- og rådgivningsselskapene. Rekrutteringsprosessen er velstrukturert med online-tester, gruppecaser og individuelle intervjuer. Kandidater til konsulentroller må forvente case-løsning foran panel.',
    questions: [
      'Løs denne casen: En norsk retailer med fallende marginer ønsker å vokse i Sverige.',
      'Beskriv en situasjon der du identifiserte et problem ingen andre hadde sett.',
      'Hva motiverer deg til en karriere i rådgivning og revisjon?',
    ],
    tips: [
      'Case-intervjuene hos PwC er strukturerte — øv med rammeverk som MECE og profitabilitetsanalyse.',
      'Gruppecaser testes ofte — vis evnen til å lytte, bidra konstruktivt og lede der det er naturlig.',
      'Vis forståelse for PwCs ulike tjenestelinjer: revisjon, skatt, rådgivning og deals.',
    ],
  },
  {
    id: 'deloitte',
    name: 'Deloitte',
    industry: 'Konsulent',
    industryKey: 'Konsulent',
    tagline: 'Globalt leder innen revisjon og management consulting',
    employees: '2 000+ ansatte i Norge',
    style: 'Profesjonelt med fokus på initiativ',
    rounds: 4,
    difficulty: 'Krevende',
    description: 'Deloitte er et av de fire store selskapene og har en bred portefølje fra revisjon til teknologirådgivning. Prosessen er strukturert med kompetansebaserte intervjuer og caser. De søker kandidater som kombinerer analytisk skarphet med gode kommunikasjonsevner.',
    questions: [
      'Beskriv et komplekst problem du løste fra start til slutt.',
      'Hva er din forståelse av digital transformasjon og hva Deloitte tilbyr innen dette?',
      'Fortell om en gang du jobbet i et team med sterk uenighet — hvordan løste dere det?',
    ],
    tips: [
      'Deloitte er bredt sammensatt — research den spesifikke divisjonen du søker til.',
      'Initiativ og selvstendighet verdsettes — gi eksempler på ting du har tatt ansvar for uten å bli bedt om det.',
      'Nettverksbygging under rekrutteringsprosessen er vanlig — delta gjerne på arrangementer.',
    ],
  },
  {
    id: 'mckinsey',
    name: 'McKinsey',
    industry: 'Konsulent',
    industryKey: 'Konsulent',
    tagline: 'Verdens mest prestisjefylte managementkonsulent',
    employees: '45 000+ ansatte globalt',
    style: 'Case-intensivt og analytisk',
    rounds: 5,
    difficulty: 'Krevende',
    description: 'McKinsey er verdens mest anerkjente konsulentselskap med en av de mest krevende rekrutteringsprosessene. Forventes minimum to case-intervjuer per runde, gjerne 4–5 runder totalt. Casen er McKinsey-strukturert og krever strukturert tenkning under press.',
    questions: [
      'Case: En norsk bank opplever at 20 % av kundene ikke fornyer produktene sine. Hva vil du gjøre?',
      'Beskriv en situasjon der du tok en analytisk beslutning med begrenset informasjon.',
      'Hva tiltrekker deg spesifikt til McKinsey fremfor andre konsulentselskaper?',
    ],
    tips: [
      'Øv intensivt på McKinsey-caser med en øvingspartner — dette er avgjørende for å lykkes.',
      'Strukturer alltid svaret ditt med en klar hypotese tidlig i casen.',
      'McKinsey søker kandidater med dokumentert lederskap — fremhev tydelige ledereksempler.',
    ],
  },
  {
    id: 'kpmg',
    name: 'KPMG',
    industry: 'Konsulent',
    industryKey: 'Konsulent',
    tagline: 'Globalt revisjons- og rådgivningsselskap',
    employees: '1 800+ ansatte i Norge',
    style: 'Strukturert og verdidrevet',
    rounds: 4,
    difficulty: 'Krevende',
    description: 'KPMG er et av de fire store selskapene med sterk norsk tilstedeværelse. Rekrutteringsprosessen er strukturert med kompetansebaserte intervjuer. De vektlegger etikk, verdier og integritet i tillegg til faglig kompetanse.',
    questions: [
      'Beskriv en situasjon der du måtte ta en beslutning med etiske implikasjoner.',
      'Hva er din forståelse av revisjonens rolle i et velfungerende næringsliv?',
      'Fortell om en gang du identifiserte en risiko som andre ikke hadde sett.',
    ],
    tips: [
      'KPMG vektlegger etikk og integritet sterkt — vær forberedt på etiske dilemmaer i intervjuet.',
      'Kjennskap til IFRS og norsk regnskapslov er en fordel for revisjonsroller.',
      'De søker teamspillere — gi gode eksempler på samarbeid og bidrag til teamet.',
    ],
  },
  {
    id: 'ey',
    name: 'EY',
    industry: 'Konsulent',
    industryKey: 'Konsulent',
    tagline: 'Globalt profesjonsselskap med sterk norsk forankring',
    employees: '1 600+ ansatte i Norge',
    style: 'Strukturert og inkluderende',
    rounds: 4,
    difficulty: 'Krevende',
    description: 'EY (Ernst & Young) er et av de fire store og profilerer seg sterkt på mangfold og inkludering. Prosessen er strukturert med kompetansebaserte intervjuer og online-tester. Kulturmatch og fremtidspotensial vektlegges like mye som akademiske meritter.',
    questions: [
      'Hva motiverer deg til å jobbe med revisjon og rådgivning?',
      'Beskriv en gang du tok et initiativ som hadde positiv effekt for et team.',
      'Hva vet du om EYs satsing på teknologi og AI i profesjonstjenester?',
    ],
    tips: [
      'EY profilerer seg på diversitet — vis din unike bakgrunn og perspektiver som en styrke.',
      'De er opptatt av langsiktig karriereutvikling — vis ambisjoner og plan for utvikling.',
      'Kjennskap til EYs ulike tjenestelinjer (Assurance, Tax, Strategy, Technology) er viktig.',
    ],
  },
  {
    id: 'accenture',
    name: 'Accenture',
    industry: 'Konsulent',
    industryKey: 'Konsulent',
    tagline: 'Globalt teknologi- og konsulentselskap i vekst',
    employees: '750 000+ ansatte globalt',
    style: 'Teknologidrevet og innovativt',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Accenture er verdens største konsulentselskap med sterk fokus på teknologi og digital transformasjon. Norsk divisjon er i vekst. Intervjuene er profesjonelle og strukturerte med fokus på teknologiforståelse og endringsevne.',
    questions: [
      'Beskriv et prosjekt der teknologi var en kritisk suksessfaktor.',
      'Hva er din forståelse av cloud computing og dens forretningsmessige verdi?',
      'Fortell om en gang du lyktes med å implementere en endring i en organisasjon.',
    ],
    tips: [
      'Accenture er teknologiledende — vis konkret teknisk kompetanse og interesse for ny teknologi.',
      'De jobber i store globale prosjekter — vis at du er komfortabel med internasjonal setting.',
      'Accenture liker kandidater med bred kompetanse — vis tverrfaglighet.',
    ],
  },

  /* ── Logistikk ── */
  {
    id: 'posten',
    name: 'Posten Norge',
    industry: 'Logistikk',
    industryKey: 'Logistikk',
    tagline: 'Norges ledende post- og logistikkselskap',
    employees: '14 000+ ansatte',
    style: 'Jordnært og operasjonelt',
    rounds: 2,
    difficulty: 'Enkel',
    description: 'Posten Norge er et statlig eid selskap i full digital transformasjon fra tradisjonell brevpost til moderne logistikk og e-handel. Intervjuprosessen er straightforward med fokus på motivasjon, pålitelighet og praktisk orientering.',
    questions: [
      'Hva interesserer deg ved logistikk og vareflyt?',
      'Beskriv en situasjon der du måtte håndtere mange oppgaver parallelt under tidspress.',
      'Hva vet du om Postens endring fra brevpost til e-handelslogistikk?',
    ],
    tips: [
      'Posten er midt i en stor transformasjon — vis at du er endringsvillig og nysgjerrig.',
      'Pålitelighet og strukturering av arbeidsdagen er høyt verdsatt i operasjonelle roller.',
      'Kjennskap til norsk e-handelsmarked og logistikk-teknologi gir et pluss.',
    ],
  },

  /* ── Transport ── */
  {
    id: 'vy',
    name: 'Vy',
    industry: 'Transport',
    industryKey: 'Transport',
    tagline: 'Norges største kollektivtransportselskap',
    employees: '8 500+ ansatte',
    style: 'Offentlig og strukturert',
    rounds: 2,
    difficulty: 'Enkel',
    description: 'Vy (tidligere NSB) er Norges største kollektivtransportselskap. Som statlig eid selskap er prosessen transparent og strukturert. Fokus på serviceorientering, sikkerhet og samfunnsansvar er gjennomgående i intervjuene.',
    questions: [
      'Hva er viktigst for deg ved å jobbe i et selskap med et tydelig samfunnsoppdrag?',
      'Beskriv en situasjon der du løste et problem for en kunde på en uventet måte.',
      'Hva er ditt syn på fremtidens kollektivtransport og grønn mobilitet?',
    ],
    tips: [
      'Vy er statlig eid med sterkt fokus på samfunnsoppdrag — vis at du identifiserer deg med dette.',
      'Sikkerhet er en absolutt kjerneverdi i transportsektoren — nevn HMS tidlig.',
      'Kjennskap til offentlige anskaffelsesprosesser og konsesjoner er en fordel.',
    ],
  },
  {
    id: 'avinor',
    name: 'Avinor',
    industry: 'Transport',
    industryKey: 'Transport',
    tagline: 'Statlig eier og driver av norske flyplasser',
    employees: '3 200+ ansatte',
    style: 'Sikkerhetsbevisst og profesjonelt',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Avinor eier og driver 44 norske flyplasser og er et statlig selskap. Sikkerhetskultur er absolutt prioritet. Rekrutteringsprosessen er strukturert med kompetansebaserte intervjuer og fokus på verdier som sikkerhet, pålitelighet og samarbeid.',
    questions: [
      'Hva betyr sikkerhet for deg i en profesjonell sammenheng?',
      'Beskriv en situasjon der du bidro til å bedre en prosess eller rutine.',
      'Hva vet du om utfordringene norsk luftfart står overfor i klimaomstillingen?',
    ],
    tips: [
      'Sikkerhet er ikke forhandlingsbart hos Avinor — vis at du tar sikkerhet på alvor med konkrete eksempler.',
      'Avinor er statseid — kjennskap til offentlig forvaltning og samfunnsoppdrag er en fordel.',
      'Vis interesse for luftfartens fremtid, særlig rundt bærekraft og elektrisk fly.',
    ],
  },

  /* ── Energi ── */
  {
    id: 'hafslund',
    name: 'Hafslund',
    industry: 'Energi',
    industryKey: 'Energi',
    tagline: 'Osloregionens ledende strøm- og nettselskap',
    employees: '2 000+ ansatte',
    style: 'Jordnært og strukturert',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Hafslund er det ledende energiselskapet i Osloregionen med virksomhet innen strømnett, kraftproduksjon og strømsalg. Rekrutteringsprosessen er profesjonell og strukturert med fokus på teknisk kompetanse og samarbeidsevner.',
    questions: [
      'Hva vet du om strømnettets oppbygning og rolle i energiforsyningen?',
      'Beskriv en situasjon der du måtte koordinere med mange ulike faggrupper.',
      'Hva er de største utfordringene for norsk energibransje de neste ti årene?',
    ],
    tips: [
      'Kjennskap til elektrisk kraft og nettinfrastruktur er en klar fordel.',
      'Hafslund er midt i en stor digitaliseringsreise — vis interesse for energiteknologi.',
      'Lokalkunnskap om Osloregionen og energimarkedet vektlegges.',
    ],
  },
  {
    id: 'akerbp',
    name: 'Aker BP',
    industry: 'Energi',
    industryKey: 'Energi',
    tagline: 'Norges nest største oljeselskap på norsk sokkel',
    employees: '2 000+ ansatte',
    style: 'Resultatorientert og teknisk',
    rounds: 4,
    difficulty: 'Krevende',
    description: 'Aker BP er et ledende olje- og gasselskap på norsk kontinentalsokkel. Rekrutteringsprosessen er krevende og teknisk for ingeniørroller, og mer forretningsorientert for støttefunksjoner. Forventer solid kunnskap om olje- og gassindustrien.',
    questions: [
      'Beskriv din erfaring med prosjektgjennomføring i olje- og gassindustrien.',
      'Hva er din forståelse av HSSE og din personlige sikkerhetsholdning?',
      'Aker BP jobber med å redusere utslipp fra operasjonene — hva er din tanke om dette?',
    ],
    tips: [
      'HSSE (Helse, Sikkerhet, Sikring og Miljø) er absolutt prioritet — vis at du lever etter disse verdiene.',
      'Aker BP er kjent for å være mer agil enn tradisjonelle oljeselskaper — vis endringsvilje.',
      'Teknisk dyktighet er nøkkelen for ingeniørroller — vær klar til tekniske spørsmål.',
    ],
  },

  /* ── IT ── */
  {
    id: 'tietoevry',
    name: 'TietoEvry',
    industry: 'IT',
    industryKey: 'IT',
    tagline: 'Nordisk IT-gigant innen digitale tjenester',
    employees: '24 000+ ansatte',
    style: 'Profesjonelt og nordisk',
    rounds: 3,
    difficulty: 'Middels',
    description: 'TietoEvry er et av Nordens største IT-selskaper og leverer digitale tjenester til offentlig og privat sektor. Intervjuprosessen er strukturert og profesjonell med fokus på teknisk kompetanse og samarbeidsevner.',
    questions: [
      'Beskriv et IT-prosjekt du ledet eller deltok i fra krav til leveranse.',
      'Hva er din erfaring med smidig metodikk og Scrum?',
      'Hvordan sikrer du kvalitet og testdekning i programvareutvikling?',
    ],
    tips: [
      'TietoEvry jobber mye med offentlig sektor — kjennskap til dette er en fordel.',
      'Nordisk samarbeidskultur og flat struktur — vis at du trives med ansvar og selvstendighet.',
      'Agile og DevOps-erfaring er etterspurt i de fleste teknologiroller.',
    ],
  },
  {
    id: 'computas',
    name: 'Computas',
    industry: 'IT',
    industryKey: 'IT',
    tagline: 'Norsk IT-konsulent med fokus på systemutvikling',
    employees: '500+ ansatte',
    style: 'Faglig og jordnært',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Computas er et norsk IT-konsulentselskap med sterk faglig kultur og lang erfaring med systemutvikling. De er kjent for høy trivsel og godt fagmiljø. Intervjuprosessen er uformell men faglig krevende, med teknisk gjennomgang.',
    questions: [
      'Beskriv et komplekst system du har vært med å utvikle eller vedlikeholde.',
      'Hva er din tilnærming til å skrive ren, vedlikeholdbar kode?',
      'Fortell om en teknisk diskusjon i teamet der du bidro til å finne en god løsning.',
    ],
    tips: [
      'Computas er faglig stolte — vis konkret teknisk kompetanse og engasjement.',
      'De er kjent for god arbeidsmiljø — vis at du er en lagspiller som bidrar positivt.',
      'Offentlig sektor-erfaring er en fordel siden de jobber mye mot stat og kommuner.',
    ],
  },
  {
    id: 'webstep',
    name: 'Webstep',
    industry: 'IT',
    industryKey: 'IT',
    tagline: 'Norsk IT-konsulent med fokus på kultur og faglig vekst',
    employees: '700+ ansatte',
    style: 'Uformelt og fagdrevet',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Webstep er et norsk IT-konsulentselskap med sterk fokus på ansattkultur og faglig utvikling. Intervjuprosessen er gjerne uformell med vekt på hvem du er som person og hva du brenner for faglig.',
    questions: [
      'Hva er du mest stolt av faglig i din karriere til nå?',
      'Beskriv din foretrukne teknologistack og begrunnelsen for valgene.',
      'Hva gjør du for å holde deg faglig oppdatert utenfor jobb?',
    ],
    tips: [
      'Webstep er opptatt av at du trives — vær ærlig om hva du ønsker fra en arbeidsgiver.',
      'Faglig passion er avgjørende — vis ekte engasjement for teknologi.',
      'De verdsetter selvstendighet og initiativ — gi eksempler på ting du har tatt eierskap over.',
    ],
  },

  /* ── Tech ── */
  {
    id: 'finn',
    name: 'Finn.no',
    industry: 'Tech',
    industryKey: 'Tech',
    tagline: 'Norges største digitale markedsplass',
    employees: '600+ ansatte',
    style: 'Datadrevet og produktfokusert',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Finn.no er Norges desidert største digitale markedsplass og en av landets sterkeste merkevarer. Intervjuprosessen er produktsentrisk og datadrevet. De søker kandidater som tenker brukeropplevelse, data og skalar løsninger.',
    questions: [
      'Hva ville du gjort for å øke konverteringsraten på Finn-annonser?',
      'Beskriv en produktbeslutning du tok basert på brukerdata.',
      'Hva er din tilnærming til A/B-testing og eksperimentering?',
    ],
    tips: [
      'Finn.no er et produkt-drevet selskap — vis at du tenker brukeropplevelse og data.',
      'De er del av Schibsted — kjennskap til medieøkosystemet er en fordel.',
      'Vis at du har en mening om markedsplasser og digital handel i Norge.',
    ],
  },
  {
    id: 'kolonial',
    name: 'Oda',
    industry: 'Tech',
    industryKey: 'Tech',
    tagline: 'Norges første og ledende nettmatbutikk',
    employees: '3 000+ ansatte',
    style: 'Startup-aktig og tempopreget',
    rounds: 2,
    difficulty: 'Enkel',
    description: 'Oda (tidligere Kolonial.no) er Norges ledende nettmatbutikk med sterk teknologikultur. Intervjuprosessen er rask og uformell. De søker folk som er endringsvillige, driftige og trives i et høytempo-miljø.',
    questions: [
      'Hva tiltrekker deg til netthandel og food tech?',
      'Beskriv en gang du løste et operasjonelt problem raskt og effektivt.',
      'Hva mener du er den største hindringen for nettmathandel i Norge?',
    ],
    tips: [
      'Oda er en skaleringsbedrift — vis at du er komfortabel med høyt tempo og endring.',
      'De er opptatt av operasjonell effektivitet — vis konkrete resultater du har oppnådd.',
      'Bærekraft og matsvinn er viktige temaer for dem — vis bevissthet rundt dette.',
    ],
  },
  {
    id: 'kahoot',
    name: 'Kahoot',
    industry: 'Tech',
    industryKey: 'Tech',
    tagline: 'Norges mest kjente globale læringsplattform',
    employees: '500+ ansatte',
    style: 'Internasjonalt og startup-preget',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Kahoot er en norsk tech-suksess med over 300 millioner brukere globalt. Selskapet er internasjonalt orientert og jobber på tvers av tidssoner. Intervjuene er gjerne på engelsk og fokuserer på initiativ, internasjonal erfaring og faglig dyktighet.',
    questions: [
      'Hva er din erfaring med å jobbe i internasjonale team på tvers av tidssoner?',
      'Beskriv et produkt du er inspirert av — hva gjør det bra?',
      'Hva er din tilnærming til å jobbe i et raskt voksende selskap?',
    ],
    tips: [
      'Kahoot er et globalt selskap — intervju gjerne på engelsk og vis internasjonal erfaring.',
      'De er et EdTech-selskap — vis interesse for læring og utdanning gjennom teknologi.',
      'Startup-mentalitet er viktig — vis at du tar initiativ og er komfortabel med ambiguitet.',
    ],
  },
  {
    id: 'gelato',
    name: 'Gelato',
    industry: 'Tech',
    industryKey: 'Tech',
    tagline: 'Norsk tech-unicorn innen print-on-demand',
    employees: '700+ ansatte',
    style: 'Internasjonalt og ambisiøst',
    rounds: 4,
    difficulty: 'Krevende',
    description: 'Gelato er en norsk tech-unicorn med virksomhet i over 30 land. De bygger en global plattform for print-on-demand. Rekrutteringsprosessen er krevende og internasjonal i stilen. Forventer ambisjoner, global tankegang og solid fagkompetanse.',
    questions: [
      'Beskriv din erfaring med å skalere en tjeneste eller produkt til nye markeder.',
      'Hva er din tilnærming til å prioritere i et selskap med mange muligheter?',
      'Fortell om en gang du påvirket selskapsstrategi eller retning.',
    ],
    tips: [
      'Gelato er et unicorn i sterk vekst — vis at du er komfortabel med hypervekst og endring.',
      'Internasjonal tankegang er essensielt — vis global perspektiv og erfaring.',
      'De søker høy ambisjon — vær tydelig på hva du vil oppnå og hvorfor Gelato er stedet.',
    ],
  },
  {
    id: 'vipps',
    name: 'Vipps',
    industry: 'Tech',
    industryKey: 'Tech',
    tagline: 'Norges aller mest brukte betalingsapp',
    employees: '500+ ansatte',
    style: 'Produktdrevet og datadrevet',
    rounds: 4,
    difficulty: 'Krevende',
    description: 'Vipps er Norges mest brukte app og en av landets sterkeste tech-merkevarer. Etter fusjon med MobilePay opererer Vipps på tvers av Norden. Rekrutteringsprosessen er krevende med fokus på produkttenkning, data og teknisk dyktighet.',
    questions: [
      'Beskriv en funksjon du ville lagt til i Vipps og begrunnelsen.',
      'Hva er din tilnærming til å jobbe med fintech og regulatoriske krav?',
      'Fortell om en gang du forbedret et produkt basert på brukerdata og tilbakemeldinger.',
    ],
    tips: [
      'Vipps er et produkt- og datadrevet selskap — vis konkret erfaring med produktutvikling.',
      'Fintech er regulert — vis bevissthet rundt compliance og GDPR.',
      'De er i nordisk ekspansjon — vis interesse for skalering og internasjonale markeder.',
    ],
  },

  /* ── Media ── */
  {
    id: 'nrk',
    name: 'NRK',
    industry: 'Media',
    industryKey: 'Media',
    tagline: 'Norges nasjonale allmennkringkaster',
    employees: '3 500+ ansatte',
    style: 'Journalistisk og faglig',
    rounds: 2,
    difficulty: 'Enkel',
    description: 'NRK er Norges offentlige allmennkringkaster med et sterkt samfunnsoppdrag. Rekrutteringsprosessen er transparent og journalistisk orientert. Faglig kompetanse, samfunnsengasjement og forståelse for NRKs oppdrag er avgjørende.',
    questions: [
      'Hva mener du er NRKs viktigste rolle i det norske demokratiet?',
      'Beskriv en sak eller innhold du ville ha produsert for NRK.',
      'Hvordan forholder du deg til presseetikk og journalistiske prinsipper?',
    ],
    tips: [
      'NRK har et sterkt samfunnsoppdrag — vis at du identifiserer deg genuint med dette.',
      'Kjennskap til mediebransjen og NRKs innholdsprofil er viktig.',
      'Presseetikk og objektivitet er sentralt — vis bevissthet rundt dette.',
    ],
  },
  {
    id: 'tv2',
    name: 'TV 2',
    industry: 'Media',
    industryKey: 'Media',
    tagline: 'Norges ledende kommersielle TV-kanal',
    employees: '1 300+ ansatte',
    style: 'Kommersielt og nyhetspreget',
    rounds: 2,
    difficulty: 'Enkel',
    description: 'TV 2 er Norges ledende kommersielle TV-kanal med sterk satsing på digitale plattformer. Intervjuprosessen er relativt uformell og fokusert på kreativitet, kommersielt instinkt og mediefaglig kompetanse.',
    questions: [
      'Hva er din mening om norsk TV-bransje og TV 2s posisjon i den?',
      'Beskriv en idé du ville pitchet til TV 2 og begrunnelsen.',
      'Hva mener du om balansen mellom seeropplevelse og kommersiell drift i mediehuset?',
    ],
    tips: [
      'TV 2 er kommersielt drevet — vis forståelse for forretningsmodellen bak innholdet.',
      'Digital satsing er stor hos TV 2 Play — vis interesse for streaming og digitale plattformer.',
      'Kreativitet og nyhetsforståelse verdsettes — ha meninger om norsk mediebilde.',
    ],
  },
  {
    id: 'vg',
    name: 'VG',
    industry: 'Media',
    industryKey: 'Media',
    tagline: 'Norges største nyhetsmedium digitalt',
    employees: '700+ ansatte',
    style: 'Dynamisk og digitalt',
    rounds: 3,
    difficulty: 'Middels',
    description: 'VG er Norges største digitale nyhetskilde og del av Schibsted-konsernet. Intervjuprosessen er dynamisk med fokus på digital kompetanse, rask tilpasning og journalistisk instinkt. De er raskt voksende på nye digitale formater.',
    questions: [
      'Hva er din tilnærming til å produsere innhold som engasjerer digitalt?',
      'Beskriv en situasjon der du måtte produsere kvalitetsinnhold under ekstremt tidspress.',
      'Hva er de viktigste trendene i digital nyhetsjournalistikk akkurat nå?',
    ],
    tips: [
      'VG er digitalt first — vis solid digital kompetanse og forståelse for plattformer.',
      'Tempo og leveranseevne er avgjørende — vis at du kan levere under press.',
      'Kjennskap til SEO, sosiale medier og analytics er en fordel.',
    ],
  },
  {
    id: 'aftenposten',
    name: 'Aftenposten',
    industry: 'Media',
    industryKey: 'Media',
    tagline: 'Norges mest anerkjente seriøsavis',
    employees: '600+ ansatte',
    style: 'Grundig og kvalitetsorientert',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Aftenposten er Norges mest anerkjente avis med sterk fokus på dybdejournalistikk og kvalitetsinnhold. Del av Schibsted. Intervjuprosessen vektlegger journalistisk grundighet, kildekritikk og samfunnsengasjement.',
    questions: [
      'Hva er din forståelse av god journalistikk og presseetikk?',
      'Beskriv et journalistisk prosjekt eller sak du er stolt av.',
      'Hvordan balanserer du krav til rask publisering og grundig journalistikk?',
    ],
    tips: [
      'Aftenposten er kjent for grundig og seriøs journalistikk — vis at du er opptatt av kvalitet.',
      'Kildekritikk og faktasjekk er absolutter — demonstrer grundig metodikk.',
      'Digital transformasjon av avisbransjen er et sentralt tema å ha meninger om.',
    ],
  },

  /* ── Handel ── */
  {
    id: 'ikea',
    name: 'IKEA Norge',
    industry: 'Handel',
    industryKey: 'Handel',
    tagline: 'Verdens største møbel- og interiørkjede',
    employees: '4 500+ ansatte i Norge',
    style: 'Verdidrevet og inkluderende',
    rounds: 2,
    difficulty: 'Enkel',
    description: 'IKEA er en av verdens mest kjente merkevarer og jobber aktivt med bærekraft og inkludering. Rekrutteringsprosessen er verdidrevet og tilgjengelig. De søker folk som identifiserer seg med IKEAs grunnverdier om folkelig design og bærekraft.',
    questions: [
      'Hva betyr IKEAs visjon "å skape en bedre hverdag for de mange" for deg?',
      'Beskriv en gang du satte kunden i sentrum for en beslutning.',
      'Hva er din tilnærming til å jobbe i et mangfoldig team?',
    ],
    tips: [
      'IKEAs verdier er sentrale — les deg opp på dem og koble dem til egne erfaringer.',
      'Mangfold og inkludering er ikke bare ord hos IKEA — vis at du genuint setter pris på dette.',
      'Bærekraft er viktig — vis interesse for sirkulærøkonomi og ansvarlig forretningsdrift.',
    ],
  },
  {
    id: 'rema',
    name: 'Rema 1000',
    industry: 'Handel',
    industryKey: 'Handel',
    tagline: 'Norges folkehandlare med enkelhetens filosofi',
    employees: '22 000+ ansatte',
    style: 'Jordnært og resultatorientert',
    rounds: 2,
    difficulty: 'Enkel',
    description: 'Rema 1000 er Norges største dagligvarekjede målt i antall butikker og en av landets mest profilerte merkevarer. Intervjuprosessen er jordnær og fokusert på resultater, motivasjon og kommersiell forståelse. Enkelthet er et kjernebegrep.',
    questions: [
      'Hva betyr det for deg å jobbe med mat og dagligvarer?',
      'Beskriv en situasjon der du leverte sterke resultater med enkle midler.',
      'Hva er din mening om Rema 1000s forretningsmodell og posisjon i dagligvaremarkedet?',
    ],
    tips: [
      'Rema 1000 er kjent for enkelhet og effektivitet — vis at du tenker enkelt og resultatorientert.',
      'Kommersielt instinkt er essensielt — vis at du forstår hva som driver lønnsomhet.',
      'Vis at du er motivert av å gjøre ting bedre for vanlige folk — det er Remas drivkraft.',
    ],
  },
  {
    id: 'coop',
    name: 'Coop',
    industry: 'Handel',
    industryKey: 'Handel',
    tagline: 'Norges nest største dagligvarekonsern',
    employees: '26 000+ ansatte',
    style: 'Samvirkeverdi og kundeorientert',
    rounds: 2,
    difficulty: 'Enkel',
    description: 'Coop er Norges nest største dagligvarekonsern og eies av over 1,7 millioner norske medlemmer. Som samvirkelag har de et unikt eierperspektiv. Intervjuprosessen er vennlig og verdibasert, med fokus på kundeorientering og samarbeid.',
    questions: [
      'Hva betyr samvirketankegangen for deg som ansatt i Coop?',
      'Beskriv en gang du bidro til å skape en god kundeopplevelse.',
      'Hva er din mening om bærekraft i dagligvarebransjen?',
    ],
    tips: [
      'Coop er eid av sine medlemmer — vis at du forstår og setter pris på samvirkeperspektivet.',
      'Kundeorientering er absolutt viktigst — vis konkrete eksempler på kundeservice.',
      'Bærekraft og matsvinn er sentrale temaer hos Coop — vis bevissthet rundt dette.',
    ],
  },
  {
    id: 'elkjop',
    name: 'Elkjøp',
    industry: 'Handel',
    industryKey: 'Handel',
    tagline: 'Nordens ledende kjede innen forbrukerelektronikk',
    employees: '3 500+ ansatte i Norge',
    style: 'Kommersielt og serviceorientert',
    rounds: 2,
    difficulty: 'Enkel',
    description: 'Elkjøp er Nordens største kjede for forbrukerelektronikk og del av Dixons Carphone-konsernet. Intervjuprosessen er uformell og fokusert på serviceorientering, produktkunnskap og salgsevner.',
    questions: [
      'Beskriv en situasjon der du solgte et produkt ved å forstå kundens virkelige behov.',
      'Hva er din tilnærming til å holde deg oppdatert på ny teknologi og produkter?',
      'Fortell om en gang du håndterte en misfornøyd kunde på en god måte.',
    ],
    tips: [
      'Produktkunnskap er avgjørende hos Elkjøp — vis teknisk interesse og nysgjerrighet.',
      'Salg og serviceorientering er kjernekompetansen — gi konkrete eksempler fra kundehåndtering.',
      'Digital kompetanse kombinert med butikk-erfaring er svært ettertraktet.',
    ],
  },
  {
    id: 'hellyhansen',
    name: 'Helly Hansen',
    industry: 'Handel',
    industryKey: 'Handel',
    tagline: 'Ikonisk norsk merkevare innen sport og friluft',
    employees: '1 400+ ansatte',
    style: 'Lidenskap og internasjonal profil',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Helly Hansen er en ikonisk norsk merkevare med lang tradisjon innen utendørsklær og sportsbekledning. Selskapet er internasjonalt orientert og drevet av lidenskap for friluftsliv. Rekrutteringsprosessen er profesjonell med vekt på merkevareforståelse og verdier.',
    questions: [
      'Hva betyr Helly Hansens arv og merkevare for deg personlig?',
      'Beskriv en situasjon der du bidro til å styrke en merkevares identitet.',
      'Hva er din mening om bærekraftig motedesign og produksjon?',
    ],
    tips: [
      'Helly Hansen er lidenskapsdrevet — vis genuin interesse for friluftsliv og sport.',
      'Merkevareforståelse er viktig — kjenn Helly Hansens posisjon og historie.',
      'De er internasjonale — vis komfortabilitet med global tankegang og engelsk.',
    ],
  },

  /* ── Reiseliv ── */
  {
    id: 'hurtigruten',
    name: 'Hurtigruten',
    industry: 'Reiseliv',
    industryKey: 'Reiseliv',
    tagline: 'Norges mest ikoniske cruiseselskap',
    employees: '2 500+ ansatte',
    style: 'Dedikert og servicefokusert',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Hurtigruten er et av Norges mest ikoniske reiselivsselskaper med ruter langs norskekysten og ekspedisjoner globalt. Intervjuprosessen er profesjonell med fokus på serviceorientering, kulturforståelse og lidenskap for reise.',
    questions: [
      'Hva tiltrekker deg ved å jobbe i et reiselivsselskap som Hurtigruten?',
      'Beskriv en situasjon der du skapte en ekstraordinær opplevelse for en kunde.',
      'Hva er din mening om Hurtigrutens satsing på bærekraftig turisme?',
    ],
    tips: [
      'Lidenskap for norsk natur og reiseliv er essensielt — vis ekte entusiasme.',
      'Service-excellence er nøkkelen — gi konkrete eksempler på eksepsjonell kundeservice.',
      'Bærekraft er et sentralt tema for Hurtigruten — vis interesse for ansvarlig turisme.',
    ],
  },
  {
    id: 'norwegian',
    name: 'Norwegian',
    industry: 'Reiseliv',
    industryKey: 'Reiseliv',
    tagline: 'Norges ledende lavprisflyselskap',
    employees: '9 000+ ansatte',
    style: 'Dynamisk og kommersiell',
    rounds: 3,
    difficulty: 'Middels',
    description: 'Norwegian er et av Europas ledende lavprisselskaper og Norges mest kjente flyselskap. Etter en krevende periode er selskapet i sterk gjenvekst. Intervjuprosessen er profesjonell med fokus på kommersielt instinkt, fleksibilitet og bidrag til vekstplaner.',
    questions: [
      'Hva vet du om Norwegians gjenoppbyggingsplan og nåværende strategi?',
      'Beskriv en situasjon der du leverte resultater i et selskap under press.',
      'Hva er ditt syn på lavprisflyging og dens innvirkning på reisemønstre?',
    ],
    tips: [
      'Norwegian er i en gjenvekstfase — vis at du liker utfordringer og er med for reisen.',
      'Kommersielt instinkt er sentralt — vis at du forstår forretningsmodellen i luftfart.',
      'Fleksibilitet og omstillingsevne er essensielt i luftfartsbransjen — gi konkrete eksempler.',
    ],
  },
];

/* ── State ───────────────────────────────────────────────────────────────── */
let searchQuery   = '';
let diffFilter    = '';
let industryFilter = '';
let openCompanyId = null;

/* ── Init ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderGrid();

  const searchEl    = document.getElementById('search');
  const clearBtn    = document.getElementById('search-clear');
  const overlay     = document.getElementById('modal-overlay');
  const closeBtn    = document.getElementById('modal-close');
  const industryEl  = document.getElementById('industry-filter');

  // Søk
  searchEl.addEventListener('input', () => {
    searchQuery = searchEl.value.trim().toLowerCase();
    clearBtn.hidden = !searchQuery;
    renderGrid();
  });

  clearBtn.addEventListener('click', () => {
    searchEl.value  = '';
    searchQuery     = '';
    clearBtn.hidden = true;
    renderGrid();
    searchEl.focus();
  });

  // Bransjefilter
  if (industryEl) {
    industryEl.addEventListener('change', () => {
      industryFilter = industryEl.value;
      renderGrid();
    });
  }

  // Vanskelighetsgrad-filter
  document.querySelectorAll('.diff-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      diffFilter = btn.dataset.diff;
      renderGrid();
    });
  });

  // Lukk modal
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});

/* ── Render grid ─────────────────────────────────────────────────────────── */
function renderGrid() {
  const grid = document.getElementById('company-grid');
  const none = document.getElementById('no-results');

  const filtered = COMPANIES.filter(c => {
    const matchSearch   = !searchQuery      || c.name.toLowerCase().includes(searchQuery) || c.industry.toLowerCase().includes(searchQuery);
    const matchDiff     = !diffFilter       || c.difficulty === diffFilter;
    const matchIndustry = !industryFilter   || c.industryKey === industryFilter;
    return matchSearch && matchDiff && matchIndustry;
  });

  grid.innerHTML = '';
  none.hidden    = filtered.length > 0;

  const diffColor = { Enkel: '#22C55E', Middels: '#FC6A03', Krevende: '#EF4444' };

  filtered.forEach((c, i) => {
    const color = diffColor[c.difficulty] || '#FC6A03';
    const card = document.createElement('div');
    card.className = 'company-card';
    card.style.animationDelay = `${i * 0.04}s`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.innerHTML = `
      <div class="card-stripe" style="background:${color}"></div>
      <div class="card-body">
        <div class="card-top">
          <div class="company-logo" style="color:${color}; background:${color}18; border-color:${color}40">${c.name[0]}</div>
          <div class="card-name-wrap">
            <div class="company-name">${c.name}</div>
            <div class="company-industry">${c.industry}</div>
          </div>
          <span class="difficulty-badge diff-${c.difficulty.toLowerCase()}">${c.difficulty}</span>
        </div>
        <p class="company-tagline">${c.tagline}</p>
        <div class="card-meta">
          <span class="meta-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${c.rounds} runder
          </span>
          <span class="meta-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ${c.employees}
          </span>
        </div>
        <div class="card-footer">
          <button class="see-more-btn">Se mer →</button>
        </div>
      </div>`;

    card.addEventListener('click',   () => openModal(c.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(c.id); });
    grid.appendChild(card);
  });
}

/* ── Modal ───────────────────────────────────────────────────────────────── */
function openModal(id) {
  const c = COMPANIES.find(x => x.id === id);
  if (!c) return;
  openCompanyId = id;

  const questionsHtml = c.questions.map(q => `<li>"${escapeHtml(q)}"</li>`).join('');
  const tipsHtml      = c.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('');

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-head">
      <div class="modal-logo">${c.name[0]}</div>
      <div>
        <div class="modal-name">${c.name}</div>
        <div class="modal-industry">${c.industry}</div>
      </div>
    </div>

    <div class="modal-chips">
      <span class="difficulty-badge diff-${c.difficulty.toLowerCase()}">${c.difficulty}</span>
      <span class="meta-chip">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${c.rounds} intervjurunder
      </span>
      <span class="meta-chip">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        ${c.style}
      </span>
    </div>

    <p class="modal-description">${escapeHtml(c.description)}</p>

    <div class="modal-section ms-questions">
      <p class="modal-section-title">Typiske spørsmål</p>
      <ul class="modal-list">${questionsHtml}</ul>
    </div>

    <div class="modal-section ms-tips">
      <p class="modal-section-title">Tips for å lykkes</p>
      <ul class="modal-list">${tipsHtml}</ul>
    </div>

    <button class="btn btn-primary btn-large modal-cta" onclick="startInterview('${escapeHtml(c.name)}')">
      Øv på intervju hos ${escapeHtml(c.name)} →
    </button>
  `;

  const overlay = document.getElementById('modal-overlay');
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';

  // Scroll modal to top
  document.getElementById('modal').scrollTop = 0;
}

function closeModal() {
  document.getElementById('modal-overlay').hidden = true;
  document.body.style.overflow = '';
  openCompanyId = null;
}

function startInterview(companyName) {
  sessionStorage.setItem('prepioPrefilledCompany', companyName);
  window.location.href = '/interview';
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
