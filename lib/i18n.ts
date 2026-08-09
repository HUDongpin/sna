export const locales = ["en", "zh-hant", "zh-hans"] as const;

export type Locale = (typeof locales)[number];

export type Dictionary = {
  nav: {
    home: string;
    mission: string;
    news: string;
    academy: string;
    about: string;
    menu: string;
    close: string;
    language: string;
  };
  common: {
    primaryCta: string;
    secondaryCta: string;
  };
  home: {
    eyebrow: string;
    title: string;
    intro: string;
    primaryCta: string;
    secondaryCta: string;
    showcaseTitle: string;
    showcaseText: string;
    cards: Array<{ title: string; text: string }>;
    whyTitle: string;
    whyText: string;
    impactTitle: string;
    impactText: string;
  };
  mission: {
    eyebrow: string;
    title: string;
    intro: string;
    principles: Array<{ title: string; text: string }>;
    strategyTitle: string;
    strategyIntro: string;
    strategies: Array<{ title: string; text: string }>;
  };
  news: {
    eyebrow: string;
    title: string;
    intro: string;
    scopeEyebrow: string;
    scopeTitle: string;
    scopeText: string;
    inclusionTitle: string;
    inclusionItems: [string, string, string];
    searchPlaceholder: string;
    allTypes: string;
    allYears: string;
    search: string;
    reset: string;
    resultCount: string;
    resultCountSingular: string;
    page: string;
    noResults: string;
    journal: string;
    conference: string;
    readArticle: string;
    openAccess: string;
    backToNews: string;
    reviewedSummary: string;
    howSnaWasUsed: string;
    networkDesign: string;
    nodes: string;
    ties: string;
    methods: string;
    keyTakeaways: string;
    whyItMatters: string;
    evidenceBoundary: string;
    source: string;
    originalArticle: string;
    reviewedOn: string;
    publicationDate: string;
    readingTime: string;
    minute: string;
    relatedArticles: string;
    previous: string;
    next: string;
    pageLabel: string;
    doiLabel: string;
  };
  academy: {
    eyebrow: string;
    title: string;
    intro: string;
    pathwayEyebrow: string;
    pathwayTitle: string;
    pathwayText: string;
    pathwaySteps: [string, string, string];
    searchPlaceholder: string;
    searchFieldLabel: string;
    allTracks: string;
    allLevels: string;
    trackFieldLabel: string;
    levelFieldLabel: string;
    search: string;
    reset: string;
    resultCount: string;
    resultCountSingular: string;
    page: string;
    noResults: string;
    tracks: {
      "network-theory": string;
      "methods-visualization": string;
      "responsible-application": string;
    };
    levels: {
      foundation: string;
      applied: string;
      advanced: string;
    };
    socialImageAlt: string;
    analysisLens: string;
    tutorial: string;
    startTutorial: string;
    minutes: string;
    backToAcademy: string;
    learningObjectives: string;
    networkSpecification: string;
    scenario: string;
    nodes: string;
    ties: string;
    networkType: string;
    stepByStep: string;
    checkpoint: string;
    interpretation: string;
    coreIdeas: string;
    practiceTask: string;
    responsibleUse: string;
    sources: string;
    relatedConcepts: string;
    relatedLessons: string;
    previousLesson: string;
    nextLesson: string;
    previous: string;
    next: string;
    pageLabel: string;
    published: string;
    reviewed: string;
  };
  about: {
    eyebrow: string;
    title: string;
    principalLabel: string;
    personTitle: string;
    personText: string;
    focusTitle: string;
    focusItems: string[];
    companyTitle: string;
    companyText: string;
    productsTitle: string;
    products: Array<{ name: string; text: string }>;
    linksTitle: string;
    externalLink: string;
  };
  footer: {
    description: string;
    navigation: string;
    scope: string;
    scopeItems: string[];
    copyright: string;
  };
  notFound: {
    title: string;
    text: string;
    cta: string;
  };
  loading: {
    label: string;
  };
  error: {
    title: string;
    text: string;
    retry: string;
  };
};

type LocaleMetadata = {
  label: string;
  languageLabel: string;
  htmlLang: string;
  dir: "ltr";
};

export const localeMeta: Record<Locale, LocaleMetadata> = {
  en: { label: "English", languageLabel: "Select language", htmlLang: "en-HK", dir: "ltr" },
  "zh-hant": {
    label: "繁體中文",
    languageLabel: "選擇語言",
    htmlLang: "zh-Hant-HK",
    dir: "ltr",
  },
  "zh-hans": {
    label: "简体中文",
    languageLabel: "选择语言",
    htmlLang: "zh-Hans-CN",
    dir: "ltr",
  },
};

const dictionaries: Record<Locale, Dictionary> = {
  en: {
    nav: {
      home: "Home",
      mission: "Mission",
      news: "News",
      academy: "Academy",
      about: "About",
      menu: "Menu",
      close: "Close",
      language: "Language",
    },
    common: {
      primaryCta: "Explore social network analysis",
      secondaryCta: "Learn about our mission",
    },
    home: {
      eyebrow: "Social Network Analysis",
      title: "See the structure behind connection.",
      intro: "Understand how relationships shape learning, organizations, communities, and change through rigorous network thinking.",
      primaryCta: "Our mission",
      secondaryCta: "About SNA.HK",
      showcaseTitle: "Relationships reveal structure",
      showcaseText:
        "Social network analysis turns patterns of connection into evidence about influence, collaboration, access, and change.",
      cards: [
        {
          title: "Mission",
          text: "Discover how SNA.hk advances rigorous, clear, and responsible network analysis.",
        },
        {
          title: "News",
          text: "Read reviewed journal and conference research that uses SNA as a data analysis approach.",
        },
        {
          title: "About",
          text: "Learn what SNA.HK covers and the principles that guide this knowledge platform.",
        },
      ],
      whyTitle: "Why social network analysis?",
      whyText:
        "Many outcomes depend not only on individual attributes, but also on who connects with whom. Network analysis makes those relational structures visible and measurable.",
      impactTitle: "From connections to actionable insight",
      impactText:
        "Well designed network evidence can strengthen research, improve collaboration, identify unequal access, and support better decisions in education, organizations, and communities.",
    },
    mission: {
      eyebrow: "Mission and Direction",
      title: "Make relationships visible, measurable, and useful.",
      intro:
        "SNA.hk exists to make social network analysis easier to understand, evaluate, and apply. We connect sound theory with transparent methods and responsible interpretation.",
      principles: [
        {
          title: "Relational thinking",
          text: "Study people, groups, and institutions through the connections that link them.",
        },
        {
          title: "Methodological rigor",
          text: "Use clear assumptions, appropriate measures, and reproducible analytical choices.",
        },
        {
          title: "Human context",
          text: "Interpret network patterns alongside the social settings and lived experiences behind them.",
        },
        {
          title: "Ethical responsibility",
          text: "Protect privacy, avoid harmful inference, and communicate uncertainty honestly.",
        },
      ],
      strategyTitle: "Our strategy",
      strategyIntro:
        "Four practical directions guide the platform and its future knowledge resources.",
      strategies: [
        {
          title: "Build network literacy",
          text: "Explain foundational ideas, measures, and models in clear professional language.",
        },
        {
          title: "Connect research and practice",
          text: "Translate credible findings into useful questions, tools, and applications.",
        },
        {
          title: "Communicate networks clearly",
          text: "Use thoughtful visualizations and narratives that reveal patterns without oversimplifying them.",
        },
        {
          title: "Advance responsible use",
          text: "Promote transparent, privacy aware, and context sensitive network analysis.",
        },
      ],
    },
    news: {
      eyebrow: "SNA Research News",
      title: "Read the relationships behind the results.",
      intro:
        "A reviewed collection of journal and conference articles that use social network analysis as a substantive data analysis approach.",
      scopeEyebrow: "Editorial scope",
      scopeTitle: "What belongs in this collection",
      scopeText:
        "Each item is checked against its original source and summarized through an SNA lens, with the network design, analytical choices, findings, and limits kept visible.",
      inclusionTitle: "Inclusion criteria",
      inclusionItems: [
        "Relational data with identifiable nodes and ties",
        "An explicit social network analysis method",
        "A journal article or peer-reviewed conference paper",
      ],
      searchPlaceholder: "Search title, author, venue, method, or topic",
      allTypes: "All article types",
      allYears: "All years",
      search: "Search",
      reset: "Reset",
      resultCount: "articles",
      resultCountSingular: "article",
      page: "Page",
      noResults: "No reviewed articles match these filters.",
      journal: "Journal article",
      conference: "Conference paper",
      readArticle: "Read reviewed summary",
      openAccess: "Open access",
      backToNews: "Back to SNA Research News",
      reviewedSummary: "Reviewed summary",
      howSnaWasUsed: "How SNA was used",
      networkDesign: "Network design",
      nodes: "Nodes",
      ties: "Ties",
      methods: "Methods",
      keyTakeaways: "Key takeaways",
      whyItMatters: "Why it matters",
      evidenceBoundary: "Evidence boundary",
      source: "Source",
      originalArticle: "Open original article",
      reviewedOn: "Reviewed",
      publicationDate: "Published",
      readingTime: "Estimated reading time",
      minute: "min",
      relatedArticles: "Related SNA articles",
      previous: "Previous",
      next: "Next",
      pageLabel: "Research News pagination",
      doiLabel: "DOI",
    },
    academy: {
      eyebrow: "SNA Academy",
      title: "Learn SNA as a complete data analysis approach.",
      intro:
        "Six reviewed tutorials move from relational questions and clean network data to descriptive measures, permutation tests, and responsible statistical modeling.",
      pathwayEyebrow: "Learning pathway",
      pathwayTitle: "One connected workflow, not isolated metrics",
      pathwayText:
        "Start with measurement, build a reproducible network, then choose analyses whose assumptions match the social process you want to understand.",
      pathwaySteps: [
        "Specify nodes, ties, boundaries, and missingness",
        "Represent and describe the network transparently",
        "Test, model, and interpret within clear evidence limits",
      ],
      searchPlaceholder: "Search title, method, concept, or learning outcome",
      searchFieldLabel: "Search SNA Academy tutorials",
      allTracks: "All tracks",
      allLevels: "All levels",
      trackFieldLabel: "Filter by track",
      levelFieldLabel: "Filter by level",
      search: "Search",
      reset: "Reset",
      resultCount: "tutorials",
      resultCountSingular: "tutorial",
      page: "Page",
      noResults: "No SNA tutorials match these filters.",
      tracks: {
        "network-theory": "Network Theory",
        "methods-visualization": "Methods and Visualization",
        "responsible-application": "Responsible Application",
      },
      levels: {
        foundation: "Foundation",
        applied: "Applied",
        advanced: "Advanced",
      },
      socialImageAlt: "SNA.HK Social Network Analysis",
      analysisLens: "Analysis lens",
      tutorial: "Tutorial",
      startTutorial: "Start tutorial",
      minutes: "min",
      backToAcademy: "Back to SNA Academy",
      learningObjectives: "By the end of this tutorial",
      networkSpecification: "Network specification",
      scenario: "Analysis scenario",
      nodes: "Nodes",
      ties: "Ties",
      networkType: "Network type",
      stepByStep: "Step-by-step tutorial",
      checkpoint: "Checkpoint",
      interpretation: "Interpret with care",
      coreIdeas: "3 core ideas",
      practiceTask: "Practice task",
      responsibleUse: "Evidence and privacy boundary",
      sources: "Method sources",
      relatedConcepts: "3 related concepts",
      relatedLessons: "Related SNA tutorials",
      previousLesson: "Previous tutorial",
      nextLesson: "Next tutorial",
      previous: "Previous",
      next: "Next",
      pageLabel: "SNA Academy pagination",
      published: "Published",
      reviewed: "Reviewed",
    },
    about: {
      eyebrow: "About",
      title: "The Initiator of SNA.HK and the Network Research Ecosystem",
      principalLabel: "Initiator",
      personTitle: "About Dr. Peter Hu Dongpin",
      personText:
        "Dr. Peter Hu Dongpin is the initiator of SNA.HK, an educational researcher, and an application developer. His work connects network analysis, learning analytics, and technology-enhanced learning to make relational structures visible and useful.",
      focusTitle: "SNA research and development focus",
      focusItems: [
        "Social network analysis in education",
        "Learning and collaboration networks",
        "Epistemic network analysis and visualization",
        "Responsible analysis of relational data",
      ],
      companyTitle: "Related company",
      companyText:
        "PedaNova Ed-Tech connects educational science with future-facing learning technology as part of Dr. Hu's broader R&D ecosystem. Within this ecosystem, SNA.js and 3D ENA are the tools focused on network analysis.",
      productsTitle: "Network tools",
      products: [
        {
          name: "SNA.js",
          text: "A browser and Node.js library that ports the R sna package to TypeScript and JavaScript, with executable tests for parity with R.",
        },
        {
          name: "3D ENA",
          text: "Three-dimensional epistemic network analysis and visualization for examining relationships among coded concepts.",
        },
      ],
      linksTitle: "SNA R&D links",
      externalLink: "Open website",
    },
    footer: {
      description:
        "A multilingual knowledge hub for clear, rigorous, and responsible social network analysis.",
      navigation: "Navigation",
      scope: "Focus",
      scopeItems: ["Network theory", "Methods and visualization", "Responsible application"],
      copyright: "SNA.hk. All rights reserved.",
    },
    notFound: {
      title: "Page not found",
      text: "The page you requested does not exist or may have moved.",
      cta: "Return home",
    },
    loading: {
      label: "Loading",
    },
    error: {
      title: "Something went wrong",
      text: "We could not load this page. Please try again.",
      retry: "Try again",
    },
  },
  "zh-hant": {
    nav: {
      home: "首頁",
      mission: "使命",
      news: "最新消息",
      academy: "學苑",
      about: "關於我們",
      menu: "選單",
      close: "關閉",
      language: "語言",
    },
    common: {
      primaryCta: "探索社會網絡分析",
      secondaryCta: "了解我們的使命",
    },
    home: {
      eyebrow: "社會網絡分析",
      title: "看見連結背後的結構。",
      intro: "以嚴謹的網絡思維，理解關係如何塑造學習、組織、社群與改變。",
      primaryCta: "我們的使命",
      secondaryCta: "關於 SNA.HK",
      showcaseTitle: "關係揭示結構",
      showcaseText:
        "社會網絡分析把連結模式轉化為證據，呈現影響力、協作、資源取得與改變。",
      cards: [
        {
          title: "使命",
          text: "了解 SNA.hk 如何以嚴謹、清晰而負責任的方式推動網絡分析。",
        },
        {
          title: "最新消息",
          text: "閱讀以 SNA 作為資料分析方法的精選期刊及會議研究。",
        },
        {
          title: "關於我們",
          text: "了解 SNA.HK 的內容範圍，以及引領此知識平台的核心準則。",
        },
      ],
      whyTitle: "為甚麼需要社會網絡分析？",
      whyText:
        "許多結果不只取決於個人特質，也取決於誰與誰建立連結。網絡分析讓這些關係結構變得可見並可量度。",
      impactTitle: "從連結走向可行洞見",
      impactText:
        "妥善設計的網絡證據能夠強化研究、改善協作、識別資源取得的不平等，並支援教育、組織與社群作出更好的決策。",
    },
    mission: {
      eyebrow: "使命與方向",
      title: "讓關係變得可見、可量度，並轉化為有用洞見。",
      intro:
        "SNA.hk 致力讓社會網絡分析更容易理解、評估與應用。我們連結紮實理論、透明方法與負責任的詮釋。",
      principles: [
        {
          title: "關係思維",
          text: "透過連結個人、群體與機構的關係來理解社會現象。",
        },
        {
          title: "方法嚴謹",
          text: "採用清晰假設、合適指標，以及可重現的分析選擇。",
        },
        {
          title: "重視情境",
          text: "結合網絡模式背後的社會環境與真實經驗進行詮釋。",
        },
        {
          title: "倫理責任",
          text: "保障私隱、避免有害推論，並誠實說明不確定性。",
        },
      ],
      strategyTitle: "我們的策略",
      strategyIntro: "四個實務方向引領平台及未來知識資源的發展。",
      strategies: [
        {
          title: "建立網絡素養",
          text: "以清晰專業的語言解釋基礎概念、指標與模型。",
        },
        {
          title: "連結研究與實務",
          text: "把可信研究成果轉化為有用問題、工具與應用。",
        },
        {
          title: "清楚傳達網絡資訊",
          text: "運用恰當的視覺化與敘事揭示模式，同時避免過度簡化。",
        },
        {
          title: "推動負責任應用",
          text: "倡議透明、重視私隱並兼顧情境的網絡分析。",
        },
      ],
    },
    news: {
      eyebrow: "SNA 研究動態",
      title: "從研究結果讀懂背後的關係。",
      intro: "精選並審閱以社會網絡分析作為實質資料分析方法的期刊及會議論文。",
      scopeEyebrow: "編輯範圍",
      scopeTitle: "哪些研究會收錄於此",
      scopeText:
        "每篇內容均依據原始來源核對，並從 SNA 角度整理摘要，清楚呈現網絡設計、分析選擇、研究發現與限制。",
      inclusionTitle: "收錄準則",
      inclusionItems: [
        "採用可辨識節點與連結的關係資料",
        "明確運用社會網絡分析方法",
        "屬於期刊論文或經同儕評審的會議論文",
      ],
      searchPlaceholder: "搜尋標題、作者、期刊或會議、方法或主題",
      allTypes: "所有論文類型",
      allYears: "所有年份",
      search: "搜尋",
      reset: "重設",
      resultCount: "篇文章",
      resultCountSingular: "篇文章",
      page: "頁次",
      noResults: "沒有符合這些篩選條件的已審閱文章。",
      journal: "期刊論文",
      conference: "會議論文",
      readArticle: "閱讀審閱摘要",
      openAccess: "開放取用",
      backToNews: "返回 SNA 研究動態",
      reviewedSummary: "審閱摘要",
      howSnaWasUsed: "研究如何運用 SNA",
      networkDesign: "網絡設計",
      nodes: "節點",
      ties: "連結",
      methods: "方法",
      keyTakeaways: "重點摘要",
      whyItMatters: "研究意義",
      evidenceBoundary: "證據界線",
      source: "來源",
      originalArticle: "開啟原始論文",
      reviewedOn: "審閱日期",
      publicationDate: "發表日期",
      readingTime: "預計閱讀時間",
      minute: "分鐘",
      relatedArticles: "相關 SNA 文章",
      previous: "上一頁",
      next: "下一頁",
      pageLabel: "研究動態分頁",
      doiLabel: "DOI",
    },
    academy: {
      eyebrow: "社會網絡分析學苑",
      title: "把 SNA 學成一套完整的資料分析方法。",
      intro:
        "六個經審閱的教學由關係問題及乾淨網絡資料開始，逐步進入描述指標、置換檢驗及負責任統計建模。",
      pathwayEyebrow: "學習路徑",
      pathwayTitle: "一套連貫流程，而不是零散指標",
      pathwayText:
        "先做好量度與可重現網絡，再選擇假設符合所研究社會過程的分析方法。",
      pathwaySteps: [
        "界定節點、連結、邊界與缺失資料",
        "透明地呈現及描述網絡",
        "在清楚證據界線內檢驗、建模與詮釋",
      ],
      searchPlaceholder: "搜尋標題、方法、概念或學習成果",
      searchFieldLabel: "搜尋 SNA 學苑教學",
      allTracks: "所有主題",
      allLevels: "所有程度",
      trackFieldLabel: "按主題篩選",
      levelFieldLabel: "按程度篩選",
      search: "搜尋",
      reset: "重設",
      resultCount: "個教學",
      resultCountSingular: "個教學",
      page: "頁次",
      noResults: "沒有符合這些篩選條件的 SNA 教學。",
      tracks: {
        "network-theory": "網絡理論",
        "methods-visualization": "方法與視覺化",
        "responsible-application": "負責任應用",
      },
      levels: {
        foundation: "基礎",
        applied: "應用",
        advanced: "進階",
      },
      socialImageAlt: "SNA.HK 社會網絡分析",
      analysisLens: "分析視角",
      tutorial: "教學",
      startTutorial: "開始教學",
      minutes: "分鐘",
      backToAcademy: "返回社會網絡分析學苑",
      learningObjectives: "完成本教學後，你將能夠",
      networkSpecification: "網絡規格",
      scenario: "分析情境",
      nodes: "節點",
      ties: "連結",
      networkType: "網絡類型",
      stepByStep: "分步教學",
      checkpoint: "檢查點",
      interpretation: "謹慎詮釋",
      coreIdeas: "3 個核心概念",
      practiceTask: "練習任務",
      responsibleUse: "證據與私隱界線",
      sources: "方法來源",
      relatedConcepts: "3 個相關概念",
      relatedLessons: "相關 SNA 教學",
      previousLesson: "上一個教學",
      nextLesson: "下一個教學",
      previous: "上一頁",
      next: "下一頁",
      pageLabel: "SNA 學苑分頁",
      published: "發布日期",
      reviewed: "審閱日期",
    },
    about: {
      eyebrow: "關於",
      title: "SNA.HK 發起人與網絡研究生態",
      principalLabel: "發起人",
      personTitle: "關於 Dr. Peter Hu Dongpin",
      personText:
        "Dr. Peter Hu Dongpin 是 SNA.HK 的發起人、教育研究者與應用程式開發者。他的工作連結網絡分析、學習分析與科技增強學習，讓關係結構更清晰可見並可應用。",
      focusTitle: "SNA 研發焦點",
      focusItems: [
        "教育情境中的社會網絡分析",
        "學習與協作網絡",
        "認知網絡分析與視覺化",
        "負責任地分析關係資料",
      ],
      companyTitle: "相關公司",
      companyText:
        "PedaNova Ed-Tech 連結教育科學與前瞻學習科技，是 Dr. Hu 更廣泛研發生態的一部分。在此生態中，SNA.js 與 3D ENA 是專注於網絡分析的工具。",
      productsTitle: "網絡工具",
      products: [
        {
          name: "SNA.js",
          text: "把 R sna 套件移植至 TypeScript 與 JavaScript 的瀏覽器及 Node.js 社會網絡分析函式庫，並以可執行測試驗證與 R 的一致性。",
        },
        {
          name: "3D ENA",
          text: "用於檢視編碼概念之間關係的三維認知網絡分析與視覺化工具。",
        },
      ],
      linksTitle: "SNA 研發連結",
      externalLink: "開啟網站",
    },
    footer: {
      description: "推動清晰、嚴謹與負責任社會網絡分析的多語言知識平台。",
      navigation: "網站導覽",
      scope: "關注範疇",
      scopeItems: ["網絡理論", "方法與視覺化", "負責任應用"],
      copyright: "SNA.hk。版權所有。",
    },
    notFound: {
      title: "找不到頁面",
      text: "你所要求的頁面不存在或可能已移動。",
      cta: "返回首頁",
    },
    loading: {
      label: "載入中",
    },
    error: {
      title: "發生錯誤",
      text: "目前無法載入此頁，請再試一次。",
      retry: "再試一次",
    },
  },
  "zh-hans": {
    nav: {
      home: "首页",
      mission: "使命",
      news: "最新消息",
      academy: "学苑",
      about: "关于我们",
      menu: "菜单",
      close: "关闭",
      language: "语言",
    },
    common: {
      primaryCta: "探索社会网络分析",
      secondaryCta: "了解我们的使命",
    },
    home: {
      eyebrow: "社会网络分析",
      title: "看见连接背后的结构。",
      intro: "以严谨的网络思维，理解关系如何塑造学习、组织、社群与改变。",
      primaryCta: "我们的使命",
      secondaryCta: "关于 SNA.HK",
      showcaseTitle: "关系揭示结构",
      showcaseText:
        "社会网络分析把连接模式转化为证据，呈现影响力、协作、资源获取与改变。",
      cards: [
        {
          title: "使命",
          text: "了解 SNA.hk 如何以严谨、清晰且负责任的方式推动网络分析。",
        },
        {
          title: "最新消息",
          text: "阅读以 SNA 作为数据分析方法的精选期刊及会议研究。",
        },
        {
          title: "关于我们",
          text: "了解 SNA.HK 的内容范围，以及引领此知识平台的核心准则。",
        },
      ],
      whyTitle: "为什么需要社会网络分析？",
      whyText:
        "许多结果不只取决于个人特征，也取决于谁与谁建立连接。网络分析让这些关系结构变得可见并可测量。",
      impactTitle: "从连接走向可行洞见",
      impactText:
        "妥善设计的网络证据能够强化研究、改善协作、识别资源获取的不平等，并支持教育、组织与社群做出更好的决策。",
    },
    mission: {
      eyebrow: "使命与方向",
      title: "让关系变得可见、可测量，并转化为有用洞见。",
      intro:
        "SNA.hk 致力于让社会网络分析更容易理解、评估与应用。我们连接扎实理论、透明方法与负责任的解读。",
      principles: [
        {
          title: "关系思维",
          text: "通过连接个人、群体与机构的关系来理解社会现象。",
        },
        {
          title: "方法严谨",
          text: "采用清晰假设、合适指标，以及可重复的分析选择。",
        },
        {
          title: "重视情境",
          text: "结合网络模式背后的社会环境与真实经验进行解读。",
        },
        {
          title: "伦理责任",
          text: "保护隐私、避免有害推断，并诚实说明不确定性。",
        },
      ],
      strategyTitle: "我们的策略",
      strategyIntro: "四个实践方向引领平台及未来知识资源的发展。",
      strategies: [
        {
          title: "建立网络素养",
          text: "以清晰专业的语言解释基础概念、指标与模型。",
        },
        {
          title: "连接研究与实践",
          text: "把可信研究成果转化为有用问题、工具与应用。",
        },
        {
          title: "清楚传达网络信息",
          text: "运用恰当的可视化与叙事揭示模式，同时避免过度简化。",
        },
        {
          title: "推动负责任应用",
          text: "倡导透明、重视隐私并兼顾情境的网络分析。",
        },
      ],
    },
    news: {
      eyebrow: "SNA 研究动态",
      title: "从研究结果读懂背后的关系。",
      intro: "精选并审阅以社会网络分析作为实质数据分析方法的期刊及会议论文。",
      scopeEyebrow: "编辑范围",
      scopeTitle: "哪些研究会收录于此",
      scopeText:
        "每篇内容均依据原始来源核对，并从 SNA 角度整理摘要，清楚呈现网络设计、分析选择、研究发现与局限。",
      inclusionTitle: "收录标准",
      inclusionItems: [
        "采用可识别节点与连接的关系数据",
        "明确运用社会网络分析方法",
        "属于期刊论文或经同行评审的会议论文",
      ],
      searchPlaceholder: "搜索标题、作者、期刊或会议、方法或主题",
      allTypes: "所有论文类型",
      allYears: "所有年份",
      search: "搜索",
      reset: "重置",
      resultCount: "篇文章",
      resultCountSingular: "篇文章",
      page: "页码",
      noResults: "没有符合这些筛选条件的已审阅文章。",
      journal: "期刊论文",
      conference: "会议论文",
      readArticle: "阅读审阅摘要",
      openAccess: "开放获取",
      backToNews: "返回 SNA 研究动态",
      reviewedSummary: "审阅摘要",
      howSnaWasUsed: "研究如何运用 SNA",
      networkDesign: "网络设计",
      nodes: "节点",
      ties: "连接",
      methods: "方法",
      keyTakeaways: "重点摘要",
      whyItMatters: "研究意义",
      evidenceBoundary: "证据边界",
      source: "来源",
      originalArticle: "打开原始论文",
      reviewedOn: "审阅日期",
      publicationDate: "发表日期",
      readingTime: "预计阅读时间",
      minute: "分钟",
      relatedArticles: "相关 SNA 文章",
      previous: "上一页",
      next: "下一页",
      pageLabel: "研究动态分页",
      doiLabel: "DOI",
    },
    academy: {
      eyebrow: "社会网络分析学苑",
      title: "把 SNA 学成一套完整的数据分析方法。",
      intro:
        "六个经审核的教程从关系问题及干净网络数据开始，逐步进入描述指标、置换检验及负责任统计建模。",
      pathwayEyebrow: "学习路径",
      pathwayTitle: "一套连贯流程，而不是零散指标",
      pathwayText:
        "先做好测量与可重复网络，再选择假设符合所研究社会过程的分析方法。",
      pathwaySteps: [
        "界定节点、连接、边界与缺失数据",
        "透明地呈现及描述网络",
        "在清楚证据边界内检验、建模与解释",
      ],
      searchPlaceholder: "搜索标题、方法、概念或学习成果",
      searchFieldLabel: "搜索 SNA 学苑教程",
      allTracks: "所有主题",
      allLevels: "所有程度",
      trackFieldLabel: "按主题筛选",
      levelFieldLabel: "按程度筛选",
      search: "搜索",
      reset: "重置",
      resultCount: "个教程",
      resultCountSingular: "个教程",
      page: "页码",
      noResults: "没有符合这些筛选条件的 SNA 教程。",
      tracks: {
        "network-theory": "网络理论",
        "methods-visualization": "方法与可视化",
        "responsible-application": "负责任应用",
      },
      levels: {
        foundation: "基础",
        applied: "应用",
        advanced: "进阶",
      },
      socialImageAlt: "SNA.HK 社会网络分析",
      analysisLens: "分析视角",
      tutorial: "教程",
      startTutorial: "开始教程",
      minutes: "分钟",
      backToAcademy: "返回社会网络分析学苑",
      learningObjectives: "完成本教程后，你将能够",
      networkSpecification: "网络规格",
      scenario: "分析情境",
      nodes: "节点",
      ties: "连接",
      networkType: "网络类型",
      stepByStep: "分步教程",
      checkpoint: "检查点",
      interpretation: "谨慎解释",
      coreIdeas: "3 个核心概念",
      practiceTask: "练习任务",
      responsibleUse: "证据与隐私边界",
      sources: "方法来源",
      relatedConcepts: "3 个相关概念",
      relatedLessons: "相关 SNA 教程",
      previousLesson: "上一个教程",
      nextLesson: "下一个教程",
      previous: "上一页",
      next: "下一页",
      pageLabel: "SNA 学苑分页",
      published: "发布日期",
      reviewed: "审核日期",
    },
    about: {
      eyebrow: "关于",
      title: "SNA.HK 发起人与网络研究生态",
      principalLabel: "发起人",
      personTitle: "关于 Dr. Peter Hu Dongpin",
      personText:
        "Dr. Peter Hu Dongpin 是 SNA.HK 的发起人、教育研究者与应用程序开发者。他的工作连接网络分析、学习分析与技术增强学习，让关系结构更清晰可见并可应用。",
      focusTitle: "SNA 研发重点",
      focusItems: [
        "教育情境中的社会网络分析",
        "学习与协作网络",
        "认知网络分析与可视化",
        "负责任地分析关系数据",
      ],
      companyTitle: "相关公司",
      companyText:
        "PedaNova Ed-Tech 连接教育科学与前沿学习技术，是 Dr. Hu 更广泛研发体系的一部分。在此体系中，SNA.js 与 3D ENA 是专注于网络分析的工具。",
      productsTitle: "网络工具",
      products: [
        {
          name: "SNA.js",
          text: "将 R sna 软件包移植到 TypeScript 与 JavaScript 的浏览器及 Node.js 社会网络分析库，并以可执行测试验证与 R 的一致性。",
        },
        {
          name: "3D ENA",
          text: "用于检视编码概念之间关系的三维认知网络分析与可视化工具。",
        },
      ],
      linksTitle: "SNA 研发链接",
      externalLink: "打开网站",
    },
    footer: {
      description: "推动清晰、严谨与负责任社会网络分析的多语言知识平台。",
      navigation: "网站导航",
      scope: "关注领域",
      scopeItems: ["网络理论", "方法与可视化", "负责任应用"],
      copyright: "SNA.hk。版权所有。",
    },
    notFound: {
      title: "找不到页面",
      text: "你所请求的页面不存在或可能已移动。",
      cta: "返回首页",
    },
    loading: {
      label: "加载中",
    },
    error: {
      title: "发生错误",
      text: "目前无法加载此页，请重试。",
      retry: "重试",
    },
  },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function getDictionary(value: unknown): Dictionary {
  return dictionaries[isLocale(value) ? value : "en"];
}

export function getLocaleMeta(value: unknown): LocaleMetadata {
  return localeMeta[isLocale(value) ? value : "en"];
}
