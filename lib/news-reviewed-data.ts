import type { Locale } from "@/lib/i18n";
import type {
  LocalizedNewsArticle,
  NewsArticleRecord,
} from "@/lib/news-types";

export const newsArticles: NewsArticleRecord[] = [
  {
    id: "sna-007",
    sequence: 7,
    slug: "peer-networks-and-english-learning-motivation",
    type: "journal",
    authors: [
      "Hafsa Pir Mukhtar",
      "Sohil Alqazlan",
      "Muhammad Ishtiaq",
      "Yossef Mohamed Eid",
    ],
    venue: "Scientific Reports",
    citation: "Scientific Reports, 16, Article 19839",
    doi: "10.1038/s41598-026-51081-1",
    sourceUrl: "https://www.nature.com/articles/s41598-026-51081-1",
    sourceLabel: "Scientific Reports",
    publishedAt: "2026-04-29",
    year: 2026,
    reviewedAt: "2026-08-09",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-007-peer-networks-and-english-learning-motivation.png",
    summaryImage:
      "/images/news/summary/sna-007-peer-networks-and-english-learning-motivation-summary.png",
    localizations: {
      en: {
        title:
          "Investigating peer network structure and english learning motivation among Saudi secondary school students using social network analysis",
        imageAlt:
          "Directed classroom peer network with differently sized student nodes",
        summary:
          "A study of 100 secondary EFL learners found modest gender differences in network structure, but no statistically significant association between five centrality measures and English-learning motivation and almost no motivational homophily.",
        overview: [
          "The study examined whether peer-network structure differed by gender and whether learners' network positions were associated with their motivation to learn English. The participants were 100 students in four intact summer-enrichment groups in Saudi Arabia.",
          "Directed peer nominations produced classroom networks in which male groups were slightly denser and more reciprocal, while female learners tended to be more structurally central. None of the five tested centrality measures was significantly associated with motivation, and motivational assortativity was close to zero.",
        ],
        howSnaWasUsed:
          "The authors constructed directed networks from peer nominations, then calculated density, reciprocity, in-degree, out-degree, betweenness, closeness, and eigenvector centrality. Correlations and linear regressions tested links with motivation, while assortativity tested whether similarly motivated learners clustered together.",
        nodes:
          "One hundred secondary-school EFL learners enrolled in four summer-enrichment groups.",
        ties:
          "A directed nomination from one learner to a peer with whom that learner interacted.",
        methods:
          "Directed network visualization; density and reciprocity; five centrality measures; Pearson correlations; linear regressions; and motivation assortativity.",
        keyTakeaways: [
          "Male groups were slightly denser and more reciprocal, while female learners tended to occupy more central positions.",
          "No tested centrality measure had a statistically significant association with English-learning motivation.",
          "Motivation assortativity was near zero, providing little evidence that similarly motivated learners preferentially connected.",
        ],
        whyItMatters:
          "The findings caution against treating a learner's visible network position as a proxy for internal motivation. SNA made it possible to compare actual relational structure with individual survey scores and to report a meaningful null result.",
        limitations:
          "The study was cross-sectional, involved 100 students in a particular summer program, and relied on peer nominations and self-reported motivation. Its associations do not establish causation and may not generalize to other schools, age groups, or learning settings.",
        tags: ["Peer networks", "Language learning", "Centrality"],
      },
      "zh-hant": {
        title:
          "運用社會網絡分析探討沙特阿拉伯中學生的同儕網絡結構與英語學習動機",
        imageAlt: "由大小不同的學生節點構成的有向課堂同儕網絡",
        summary:
          "一項針對100名中學英語學習者的研究發現，性別之間的網絡結構差異有限，五項中心性指標與英語學習動機均沒有統計顯著關聯，動機同配性也接近於零。",
        overview: [
          "研究檢視同儕網絡結構是否存在性別差異，以及學習者的網絡位置是否與英語學習動機相關。參與者為沙特阿拉伯四個完整暑期增潤班的100名學生。",
          "研究以有向同儕提名建立課堂網絡。男性組別的密度與互惠性略高，女性學習者則較常處於結構上較中心的位置。五項中心性指標均未與動機呈統計顯著關聯，動機同配係數亦接近零。",
        ],
        howSnaWasUsed:
          "作者根據同儕提名建立有向網絡，並計算密度、互惠性、入度、出度、中介中心性、接近中心性及特徵向量中心性。研究以相關與線性迴歸檢驗網絡位置和動機的關係，再以同配性檢驗動機相近的學習者是否傾向聚集。",
        nodes: "四個暑期增潤班中的100名中學英語學習者。",
        ties: "一名學習者指向其曾互動同儕的有向提名。",
        methods:
          "有向網絡視覺化、密度與互惠性、五項中心性指標、皮爾遜相關、線性迴歸及動機同配性分析。",
        keyTakeaways: [
          "男性組別的密度與互惠性略高，女性學習者則傾向佔據較中心的位置。",
          "所有受檢驗的中心性指標均未與英語學習動機呈統計顯著關聯。",
          "動機同配性接近零，幾乎沒有證據顯示動機相近的學習者會優先建立連結。",
        ],
        whyItMatters:
          "研究提醒我們，不應把學習者可見的網絡位置直接視為其內在動機的替代指標。SNA讓研究者能把實際關係結構與個人問卷分數加以比較，並如實呈現具意義的零結果。",
        limitations:
          "研究採用橫斷面設計，只涵蓋特定暑期課程的100名學生，並依賴同儕提名與自陳動機。結果不能確立因果關係，也未必可推廣至其他學校、年齡層或學習情境。",
        tags: ["同儕網絡", "語言學習", "中心性"],
      },
      "zh-hans": {
        title:
          "运用社会网络分析探讨沙特阿拉伯中学生的同伴网络结构与英语学习动机",
        imageAlt: "由大小不同的学生节点构成的有向课堂同伴网络",
        summary:
          "一项针对100名中学英语学习者的研究发现，性别之间的网络结构差异有限，五项中心性指标与英语学习动机均没有统计显著关联，动机同配性也接近于零。",
        overview: [
          "研究考察同伴网络结构是否存在性别差异，以及学习者的网络位置是否与英语学习动机相关。参与者为沙特阿拉伯四个完整暑期拓展班的100名学生。",
          "研究通过有向同伴提名建立课堂网络。男性组别的密度与互惠性略高，女性学习者则较常处于结构上更中心的位置。五项中心性指标均未与动机呈统计显著关联，动机同配系数也接近零。",
        ],
        howSnaWasUsed:
          "作者根据同伴提名建立有向网络，并计算密度、互惠性、入度、出度、中介中心性、接近中心性和特征向量中心性。研究通过相关和线性回归检验网络位置与动机的关系，再以同配性检验动机相近的学习者是否倾向聚集。",
        nodes: "四个暑期拓展班中的100名中学英语学习者。",
        ties: "一名学习者指向其曾互动同伴的有向提名。",
        methods:
          "有向网络可视化、密度与互惠性、五项中心性指标、皮尔逊相关、线性回归及动机同配性分析。",
        keyTakeaways: [
          "男性组别的密度与互惠性略高，女性学习者则倾向占据更中心的位置。",
          "所有受检验的中心性指标均未与英语学习动机呈统计显著关联。",
          "动机同配性接近零，几乎没有证据显示动机相近的学习者会优先建立连接。",
        ],
        whyItMatters:
          "研究提醒我们，不应把学习者可见的网络位置直接视为其内在动机的替代指标。SNA使研究者能够比较实际关系结构与个人问卷分数，并如实呈现具有意义的零结果。",
        limitations:
          "研究采用横断面设计，只涵盖特定暑期课程的100名学生，并依赖同伴提名和自陈动机。结果不能确立因果关系，也未必能推广至其他学校、年龄组或学习情境。",
        tags: ["同伴网络", "语言学习", "中心性"],
      },
    },
  },
  {
    id: "sna-008",
    sequence: 8,
    slug: "bridging-stem-faculty-silos",
    type: "journal",
    authors: [
      "Lawrence Hobbie",
      "Peter A. Novick",
      "Jessica Santangelo",
      "Amanda Turner",
      "Eugenia Villa-Cuesta",
      "Kate Winter",
      "Alison Hyslop",
    ],
    venue: "Applied Network Science",
    citation: "Applied Network Science, 10, Article 63",
    doi: "10.1007/s41109-025-00750-7",
    sourceUrl:
      "https://link.springer.com/article/10.1007/s41109-025-00750-7",
    sourceLabel: "Applied Network Science",
    publishedAt: "2025-12-02",
    year: 2025,
    reviewedAt: "2026-08-12",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-008-bridging-stem-faculty-silos.png",
    summaryImage:
      "/images/news/summary/sna-008-bridging-stem-faculty-silos-summary.png",
    localizations: {
      en: {
        title:
          "A social network analysis of the (STEM)2 Network model: bridging disciplinary and institutional silos",
        imageAlt:
          "Miniature campus islands surrounding seven translucent network time planes with teal, amber, and violet collaboration ties",
        summary:
          "A longitudinal whole-network study of 43 STEM faculty found that interactions expanded across nine institutions and three disciplines over seven survey waves, while members in formal leadership roles were especially likely to connect otherwise separated groups.",
        overview: [
          "The study followed an intentionally designed faculty network that brought together biology, chemistry, and mathematics educators from nine institutions. Forty-three members who met the participation boundary completed roster-based interaction surveys at seven events across three and a half years.",
          "Average degree more than tripled from the network's beginning, and cross-institution connections increased as institution-based assortativity declined. Multiple measures pointed to less disciplinary and institutional substructure over time, while principal investigators and co-principal investigators were overrepresented among high-betweenness bridge positions.",
        ],
        howSnaWasUsed:
          "The authors built seven cumulative, undirected whole-network snapshots from roster-based reports of personal interaction. They examined degree, density, path length, diameter, within-group and cross-group edges, the E-I index, modularity, Leiden communities, clustering, attribute and degree assortativity, betweenness, randomized reference networks, and role-group comparisons.",
        nodes:
          "Forty-three faculty members from nine institutions and three STEM disciplines who joined the bounded (STEM)2 Network and met the study's participation rule.",
        ties:
          "An undirected binary connection indicated that at least one member reported a personal interaction with the other member; once reported, the connection was retained in later snapshots.",
        methods:
          "Seven cumulative whole-network snapshots; connectedness and subgroup metrics; Leiden community detection; assortativity and betweenness; randomized reference networks; and corrected nonparametric role-group comparisons.",
        keyTakeaways: [
          "Average degree more than tripled, and new cohorts became more connected after joining the network.",
          "Cross-institution ties increased while institution-based assortativity and modular separation declined over time.",
          "Formal leaders had more connections and were disproportionately represented among high-betweenness bridges.",
        ],
        whyItMatters:
          "The study shows how repeated whole-network measurement can test whether a faculty-development network is actually bridging organizational silos rather than assuming that attendance produces collaboration. Using several converging metrics makes the structural interpretation more transparent.",
        limitations:
          "This was an observational study of one voluntary, geographically concentrated network, not a randomized evaluation. A broad self-report item captured any personal interaction but not its strength, quality, or educational consequence, and carrying ties forward may stabilize later snapshots. The patterns support network-development claims, but they do not establish that the program caused faculty change, collaboration quality, or improved student outcomes.",
        tags: ["Faculty networks", "Longitudinal SNA", "Organizational bridges"],
      },
      "zh-hant": {
        title: "運用社會網絡分析研究 (STEM)2 網絡模式如何跨越學科與院校藩籬",
        imageAlt:
          "多個微縮校園環繞七個半透明網絡時間平面，並由青綠、琥珀及紫藍色協作連結相接",
        summary:
          "一項針對43名 STEM 教師的縱向完整網絡研究發現，在七輪調查期間，互動逐步跨越九所院校與三個學科，而擔任正式領導角色的成員尤其常連接原本分隔的群體。",
        overview: [
          "研究追蹤一個經刻意設計的教師網絡，匯聚來自九所院校的生物、化學及數學教育工作者。共有43名符合參與邊界的成員，在三年半內七次活動中完成名冊式互動問卷。",
          "平均度數由網絡建立初期起增加超過三倍，跨院校連結增加，按院校計算的屬性同配性則下降。多項指標均顯示學科及院校子結構隨時間減弱，而首席研究員與共同首席研究員在高中介中心性的橋接位置中所佔比例特別高。",
        ],
        howSnaWasUsed:
          "作者根據名冊式個人互動報告建立七個累積、無向的完整網絡快照，分析度數、密度、路徑長度、直徑、組內與跨組連結、E-I 指數、模組度、Leiden 社群、聚類、屬性與度數同配性、中介中心性、隨機參照網絡及不同角色組別。",
        nodes:
          "來自九所院校及三個 STEM 學科、加入有清楚邊界的 (STEM)2 網絡並符合研究參與規則的43名教師。",
        ties:
          "一條無向二元連結表示至少一名成員報告曾與另一名成員親自互動；連結一經報告，便保留在後續快照中。",
        methods:
          "七個累積完整網絡快照、連通性與子群指標、Leiden 社群偵測、同配性與中介中心性、隨機參照網絡，以及經校正的非參數角色組別比較。",
        keyTakeaways: [
          "平均度數增加超過三倍，新加入的梯次亦在加入後逐步建立更多連結。",
          "跨院校連結增加，而按院校計算的同配性及模組分隔則隨時間下降。",
          "正式領導者擁有更多連結，並在高中介中心性的橋接位置中佔較高比例。",
        ],
        whyItMatters:
          "研究展示如何以重複完整網絡量度，檢驗教師發展網絡是否真正跨越組織藩籬，而不是假定參與活動自然會帶來協作。多項互相呼應的指標亦令結構詮釋更透明。",
        limitations:
          "這是一項針對單一自願參與、地理範圍集中的網絡之觀察研究，並非隨機評估。概括的自陳題目只記錄是否曾互動，未量度連結強度、質素或教育後果；把既有連結延續至後續快照亦可能令網絡顯得較穩定。結果支持網絡發展的描述，但不能證明計劃導致教師改變、提升協作品質或改善學生結果。",
        tags: ["教師網絡", "縱向 SNA", "組織橋接"],
      },
      "zh-hans": {
        title: "运用社会网络分析研究 (STEM)2 网络模式如何跨越学科与院校壁垒",
        imageAlt:
          "多个微缩校园环绕七个半透明网络时间平面，并由青绿、琥珀及紫蓝色协作连接相接",
        summary:
          "一项针对43名 STEM 教师的纵向完整网络研究发现，在七轮调查期间，互动逐步跨越九所院校与三个学科，而担任正式领导角色的成员尤其常连接原本分隔的群体。",
        overview: [
          "研究追踪一个经刻意设计的教师网络，汇聚来自九所院校的生物、化学及数学教育工作者。共有43名符合参与边界的成员，在三年半内七次活动中完成名册式互动问卷。",
          "平均度数从网络建立初期起增加超过三倍，跨院校连接增加，按院校计算的属性同配性则下降。多项指标均显示学科及院校子结构随时间减弱，而首席研究员与共同首席研究员在高中介中心性的桥接位置中所占比例特别高。",
        ],
        howSnaWasUsed:
          "作者根据名册式个人互动报告建立七个累积、无向的完整网络快照，分析度数、密度、路径长度、直径、组内与跨组连接、E-I 指数、模块度、Leiden 社群、聚类、属性与度数同配性、中介中心性、随机参照网络及不同角色组别。",
        nodes:
          "来自九所院校及三个 STEM 学科、加入有清楚边界的 (STEM)2 网络并符合研究参与规则的43名教师。",
        ties:
          "一条无向二元连接表示至少一名成员报告曾与另一名成员亲自互动；连接一经报告，便保留在后续快照中。",
        methods:
          "七个累积完整网络快照、连通性与子群指标、Leiden 社群检测、同配性与中介中心性、随机参照网络，以及经校正的非参数角色组别比较。",
        keyTakeaways: [
          "平均度数增加超过三倍，新加入的批次也在加入后逐步建立更多连接。",
          "跨院校连接增加，而按院校计算的同配性及模块分隔则随时间下降。",
          "正式领导者拥有更多连接，并在高中介中心性的桥接位置中占较高比例。",
        ],
        whyItMatters:
          "研究展示如何通过重复完整网络测量，检验教师发展网络是否真正跨越组织壁垒，而不是假定参与活动自然会带来协作。多项相互呼应的指标也使结构解释更加透明。",
        limitations:
          "这是一项针对单一自愿参与、地理范围集中的网络之观察研究，并非随机评估。概括的自陈题目只记录是否曾互动，未测量连接强度、质量或教育后果；把既有连接延续至后续快照也可能使网络显得较稳定。结果支持网络发展的描述，但不能证明项目导致教师改变、提升协作质量或改善学生结果。",
        tags: ["教师网络", "纵向 SNA", "组织桥接"],
      },
    },
  },
  {
    id: "sna-006",
    sequence: 6,
    slug: "social-presence-and-peer-interactions",
    type: "journal",
    authors: [
      "Daniela Castellanos-Reyes",
      "Jennifer C. Richardson",
      "Yukiko Maeda",
    ],
    venue: "The Internet and Higher Education",
    citation: "The Internet and Higher Education, 61, Article 100939",
    doi: "10.1016/j.iheduc.2024.100939",
    sourceUrl:
      "https://www.sciencedirect.com/science/article/pii/S1096751624000010",
    sourceLabel: "ScienceDirect",
    publishedAt: "2024-04",
    year: 2024,
    reviewedAt: "2026-08-09",
    openAccess: false,
    coverImage:
      "/images/news/covers/sna-006-social-presence-and-peer-interactions.png",
    summaryImage:
      "/images/news/summary/sna-006-social-presence-and-peer-interactions-summary.png",
    localizations: {
      en: {
        title:
          "The evolution of social presence: A longitudinal exploration of the effect of online students' peer-interactions using social network analysis",
        imageAlt:
          "Longitudinal peer-nomination network connecting online learners across three courses",
        summary:
          "A longitudinal network model followed peer nominations and perceived social presence across three consecutive online courses, finding growing reciprocity and a popularity advantage but no evidence that learners imitated peers' social-presence perceptions.",
        overview: [
          "The study asked how perceived social presence and peer relationships develop over time in online higher education. Rather than treating forum activity as the whole social environment, it repeatedly collected learners' own nominations of peers with whom they shared an interpersonal relationship.",
          "Across three consecutive courses, learners increasingly reciprocated nominations and already-popular learners attracted further ties. Learners who nominated more peers reported higher social presence, while overall social-presence perceptions declined and the model found no evidence of peer imitation.",
        ],
        howSnaWasUsed:
          "The researchers used a stochastic actor-oriented model to analyze repeated peer-nomination networks together with repeated social-presence scores. The model estimated network processes such as reciprocity and preferential attachment while testing whether network selection and changes in social presence moved together over time.",
        nodes:
          "One hundred ninety-seven online master's students followed as one cohort through three consecutive courses.",
        ties:
          "A directed nomination of a peer with whom a student reported sharing affectively or having an interpersonal relationship.",
        methods:
          "Longitudinal peer-nomination networks, repeated social-presence measures, and a stochastic actor-oriented model of network selection and behavioral change.",
        keyTakeaways: [
          "Peer nominations became more reciprocal across the three-course sequence.",
          "Popular learners tended to attract more ties, and learners making more nominations reported higher social presence.",
          "The model found no evidence that learners imitated peers' social-presence perceptions, even as average perceptions declined.",
        ],
        whyItMatters:
          "Longitudinal SNA can separate the evolution of relationships from changes in an individual perception. That distinction helps online-learning designers avoid assuming that a cross-sectional association is evidence of peer influence.",
        limitations:
          "The study followed one online cohort and used self-reported peer nominations and social-presence perceptions. A longitudinal actor-oriented model strengthens temporal analysis but does not by itself prove causality or guarantee that the same dynamics occur in other programs.",
        tags: ["Online learning", "Longitudinal networks", "Social presence"],
      },
      "zh-hant": {
        title:
          "社會臨場感的演變：運用社會網絡分析縱向探討線上學生同儕互動的作用",
        imageAlt: "連結學生三門連續線上課程的縱向同儕提名網絡",
        summary:
          "研究以縱向網絡模型追蹤三門連續線上課程中的同儕提名與社會臨場感，發現互惠性增強且受歡迎者更容易獲得新連結，但沒有證據顯示學習者會模仿同儕的社會臨場感知。",
        overview: [
          "研究探問線上高等教育中的社會臨場感與同儕關係如何隨時間發展。研究沒有把討論區活動視為全部社交環境，而是重複收集學習者對具有情感分享或人際關係之同儕的提名。",
          "在三門連續課程中，同儕提名逐漸更具互惠性，原本較受歡迎的學習者也吸引更多連結。提名較多同儕的學習者報告較高社會臨場感，但整體社會臨場感隨時間下降，模型亦未發現同儕模仿的證據。",
        ],
        howSnaWasUsed:
          "研究者以隨機行動者導向模型，同時分析重複測量的同儕提名網絡與社會臨場感分數。模型估計互惠性、優先連結等網絡過程，並檢驗網絡選擇和社會臨場感變化是否隨時間共同演變。",
        nodes: "在三門連續課程中作為同一群組被追蹤的197名線上碩士生。",
        ties: "學生提名與其有情感分享或人際關係之同儕所形成的有向連結。",
        methods:
          "縱向同儕提名網絡、重複社會臨場感測量，以及分析網絡選擇與行為變化的隨機行動者導向模型。",
        keyTakeaways: [
          "在三門連續課程中，同儕提名逐漸呈現更高互惠性。",
          "原本受歡迎的學習者傾向吸引更多連結，而提名較多同儕者報告較高社會臨場感。",
          "即使平均社會臨場感下降，模型仍沒有發現學習者模仿同儕感知的證據。",
        ],
        whyItMatters:
          "縱向SNA能把關係網絡的演變與個人感知的變化區分開來。這項區分可避免線上學習設計者把橫斷面關聯誤當成同儕影響的證據。",
        limitations:
          "研究只追蹤一個線上學習群組，並使用自陳同儕提名與社會臨場感。縱向行動者導向模型加強了時間分析，但本身不能證明因果，也不能保證其他課程會出現相同動態。",
        tags: ["線上學習", "縱向網絡", "社會臨場感"],
      },
      "zh-hans": {
        title:
          "社会临场感的演变：运用社会网络分析纵向探讨在线学生同伴互动的作用",
        imageAlt: "连接学生三门连续在线课程的纵向同伴提名网络",
        summary:
          "研究以纵向网络模型追踪三门连续在线课程中的同伴提名与社会临场感，发现互惠性增强且受欢迎者更容易获得新连接，但没有证据显示学习者会模仿同伴的社会临场感知。",
        overview: [
          "研究探问在线高等教育中的社会临场感与同伴关系如何随时间发展。研究没有把讨论区活动视为全部社交环境，而是重复收集学习者对具有情感分享或人际关系之同伴的提名。",
          "在三门连续课程中，同伴提名逐渐更具互惠性，原本较受欢迎的学习者也吸引更多连接。提名较多同伴的学习者报告较高社会临场感，但整体社会临场感随时间下降，模型也未发现同伴模仿的证据。",
        ],
        howSnaWasUsed:
          "研究者使用随机行动者导向模型，同时分析重复测量的同伴提名网络与社会临场感分数。模型估计互惠性、优先连接等网络过程，并检验网络选择和社会临场感变化是否随时间共同演变。",
        nodes: "在三门连续课程中作为同一群体被追踪的197名在线硕士生。",
        ties: "学生提名与其有情感分享或人际关系之同伴所形成的有向连接。",
        methods:
          "纵向同伴提名网络、重复社会临场感测量，以及分析网络选择与行为变化的随机行动者导向模型。",
        keyTakeaways: [
          "在三门连续课程中，同伴提名逐渐呈现更高互惠性。",
          "原本受欢迎的学习者倾向吸引更多连接，而提名较多同伴者报告较高社会临场感。",
          "即使平均社会临场感下降，模型仍没有发现学习者模仿同伴感知的证据。",
        ],
        whyItMatters:
          "纵向SNA能够把关系网络的演变与个人感知的变化区分开来。这一区分可避免在线学习设计者把横断面关联误当作同伴影响的证据。",
        limitations:
          "研究只追踪一个在线学习群体，并使用自陈同伴提名和社会临场感。纵向行动者导向模型加强了时间分析，但本身不能证明因果，也不能保证其他课程会出现相同动态。",
        tags: ["在线学习", "纵向网络", "社会临场感"],
      },
    },
  },
  {
    id: "sna-005",
    sequence: 5,
    slug: "collaborating-engineering-groups",
    type: "conference",
    authors: ["Brayan Díaz", "Cesar Delgado", "Collin Lynch", "Kevin Han"],
    venue: "17th International Conference of the Learning Sciences (ICLS 2023)",
    citation:
      "Proceedings of the International Conference of the Learning Sciences, 1382-1385",
    doi: "10.22318/icls2023.323952",
    sourceUrl: "https://repository.isls.org/handle/1/9927",
    sourceLabel: "ISLS Repository",
    publishedAt: "2023-10-03",
    year: 2023,
    reviewedAt: "2026-08-09",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-005-collaborating-engineering-groups.png",
    summaryImage:
      "/images/news/summary/sna-005-collaborating-engineering-groups-summary.png",
    localizations: {
      en: {
        title:
          "Using Social Network Analysis to Evaluate the Functioning of a Class With Multiple Collaborating Groups",
        imageAlt:
          "Communication network linking several engineering project groups through Slack",
        summary:
          "Slack messages from a multidisciplinary graduate engineering course were analyzed as networks within and across teams, revealing overlaps, boundary practices, peripheral connections, and changes in coordination over time.",
        overview: [
          "Students in the course worked in small teams on separate components of a larger robotic computer-vision project. Completing the shared system required both collaboration within teams and coordination across team boundaries.",
          "The researchers used Slack communication records to evaluate participation and interaction through a Community of Practice lens. The network patterns illustrated three kinds of group-to-group connection and showed how cross-team communication changed during the course.",
        ],
        howSnaWasUsed:
          "Slack messages were represented as communication ties and examined at individual and group levels. Network visualizations and temporal summaries were interpreted against Community of Practice concepts: overlaps, boundary practices, and peripheral connections.",
        nodes:
          "Graduate engineering students and their project groups in one multidisciplinary course.",
        ties:
          "Slack message exchanges within a project group or across the boundaries of different groups.",
        methods:
          "Communication-network construction, SNA visualization and participation analysis, temporal comparison of group-to-group interaction, and Community of Practice interpretation.",
        keyTakeaways: [
          "SNA made communication within teams and coordination across team boundaries visible in the same representation.",
          "Observed group-to-group links could be interpreted as overlaps, boundary practices, or peripheral connections.",
          "Message timestamps showed that patterns of communication and coordination changed during the project.",
        ],
        whyItMatters:
          "Complex team projects can appear active while still depending on a small number of boundary spanners. Network evidence gives instructors a practical way to inspect where coordination occurs and where a multi-group class may need support.",
        limitations:
          "This was a short conference report about one graduate engineering course. Slack records do not capture offline communication, and the descriptive network patterns do not demonstrate that monitoring them caused better collaboration or learning.",
        tags: [
          "Engineering education",
          "Team collaboration",
          "Communities of practice",
        ],
      },
      "zh-hant": {
        title: "運用社會網絡分析評估多個協作小組課堂的運作",
        imageAlt: "透過Slack連結多個工程專案小組的溝通網絡",
        summary:
          "研究把一門跨學科研究生工程課程的Slack訊息分析為組內與跨組網絡，呈現重疊、邊界實踐、周邊連結，以及協調模式隨時間的變化。",
        overview: [
          "課程中的學生以小組形式負責大型機器人電腦視覺專案的不同組件。要完成共同系統，學生既要在組內協作，也要跨越小組邊界進行協調。",
          "研究者利用Slack溝通紀錄，從實踐社群視角評估參與和互動。網絡形態呈現三種組際連結，並顯示跨組溝通在課程期間如何變化。",
        ],
        howSnaWasUsed:
          "研究把Slack訊息表示為溝通連結，並在個人和小組層面加以檢視。研究者依據實踐社群概念解讀網絡視覺化與時間摘要，包括重疊、邊界實踐和周邊連結。",
        nodes: "一門跨學科課程中的研究生工程學生及其專案小組。",
        ties: "同一專案小組內部或不同小組邊界之間的Slack訊息交流。",
        methods:
          "溝通網絡建構、SNA視覺化與參與分析、組際互動的時間比較，以及實踐社群框架解讀。",
        keyTakeaways: [
          "SNA在同一個表示中呈現了組內溝通與跨組邊界協調。",
          "觀察到的組際連結可解讀為重疊、邊界實踐或周邊連結。",
          "訊息時間戳顯示，溝通與協調模式會在專案進行期間改變。",
        ],
        whyItMatters:
          "複雜團隊專案表面上可能非常活躍，實際上卻依賴少數跨界連結者。網絡證據讓教師能實際檢視協調發生的位置，以及多小組課堂可能需要支援的地方。",
        limitations:
          "這是一篇關於單一研究生工程課程的短篇會議論文。Slack紀錄沒有涵蓋線下溝通，而描述性的網絡形態也不能證明監測網絡會造成更好的協作或學習。",
        tags: ["工程教育", "團隊協作", "實踐社群"],
      },
      "zh-hans": {
        title: "运用社会网络分析评估多个协作小组课堂的运作",
        imageAlt: "通过Slack连接多个工程项目小组的沟通网络",
        summary:
          "研究把一门跨学科研究生工程课程的Slack消息分析为组内和跨组网络，呈现重叠、边界实践、外围连接，以及协调模式随时间的变化。",
        overview: [
          "课程中的学生以小组形式负责大型机器人计算机视觉项目的不同组件。要完成共同系统，学生既要在组内协作，也要跨越小组边界进行协调。",
          "研究者利用Slack沟通记录，从实践共同体视角评估参与和互动。网络形态呈现三种组际连接，并显示跨组沟通在课程期间如何变化。",
        ],
        howSnaWasUsed:
          "研究把Slack消息表示为沟通连接，并在个人和小组层面加以考察。研究者依据实践共同体概念解读网络可视化和时间摘要，包括重叠、边界实践和外围连接。",
        nodes: "一门跨学科课程中的研究生工程学生及其项目小组。",
        ties: "同一项目小组内部或不同小组边界之间的Slack消息交流。",
        methods:
          "沟通网络构建、SNA可视化与参与分析、组际互动的时间比较，以及实践共同体框架解读。",
        keyTakeaways: [
          "SNA在同一个表示中呈现了组内沟通与跨组边界协调。",
          "观察到的组际连接可解读为重叠、边界实践或外围连接。",
          "消息时间戳显示，沟通与协调模式会在项目进行期间发生变化。",
        ],
        whyItMatters:
          "复杂团队项目表面上可能非常活跃，实际上却依赖少数跨界连接者。网络证据使教师能够实际考察协调发生的位置，以及多小组课堂可能需要支持的地方。",
        limitations:
          "这是一篇关于单一研究生工程课程的短篇会议论文。Slack记录没有涵盖线下沟通，而描述性的网络形态也不能证明监测网络会带来更好的协作或学习。",
        tags: ["工程教育", "团队协作", "实践共同体"],
      },
    },
  },
  {
    id: "sna-004",
    sequence: 4,
    slug: "stem-learning-communities-and-segmentation",
    type: "journal",
    authors: [
      "Wesley Jeffrey",
      "David R. Schaefer",
      "Di Xu",
      "Peter McPartlan",
      "Sabrina Solanki",
    ],
    venue: "Scientific Reports",
    citation: "Scientific Reports, 12, Article 12442",
    doi: "10.1038/s41598-022-15575-y",
    sourceUrl: "https://www.nature.com/articles/s41598-022-15575-y",
    sourceLabel: "Scientific Reports",
    publishedAt: "2022-07-20",
    year: 2022,
    reviewedAt: "2026-08-09",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-004-stem-learning-communities-and-segmentation.png",
    summaryImage:
      "/images/news/summary/sna-004-stem-learning-communities-and-segmentation-summary.png",
    localizations: {
      en: {
        title:
          "STEM learning communities promote friendships but risk academic segmentation",
        imageAlt:
          "Directed STEM friendship network clustered by learning-community participation",
        summary:
          "A quasi-experimental study found that a STEM learning community expanded participants' friendship networks while also concentrating more of their friendships inside the program, revealing integration and segmentation at the same time.",
        overview: [
          "The study examined whether a first-year STEM learning community changed the size, strength, structure, and composition of friendship networks among students in the same biological-sciences major. It combined a regression-discontinuity design with relational data from two cohorts.",
          "Participation was estimated to add about one friend in the major, with marginal statistical support, and increase the share of friends inside the learning community by 54 percentage points. The networks also became more segmented by participation status, and the ERGMs supported structured co-enrollment as a mechanism creating opportunities for ties.",
        ],
        howSnaWasUsed:
          "Directed friendship nominations were analyzed with network outcomes and exponential random graph models. The ERGMs tested whether learning-community participation, shared classes, homophily, reciprocity, and endogenous network structure were associated with the probability of a friendship tie.",
        nodes:
          "First-year students in a biological-sciences major across two entering cohorts.",
        ties:
          "A directed friendship nomination from one student to another at the end of the first quarter.",
        methods:
          "Quasi-experimental regression discontinuity, directed friendship-network measures, and cohort-specific exponential random graph models estimated with statnet.",
        keyTakeaways: [
          "Learning-community participation was estimated to add about one friend within the major, with marginal statistical support.",
          "Participants' share of friends inside the learning community rose by an estimated 54 percentage points.",
          "The program promoted social integration but also increased network segmentation by participation status.",
        ],
        whyItMatters:
          "SNA surfaced a policy trade-off that individual-level outcomes could miss: a program can help students form relationships while narrowing where those relationships are concentrated. That distinction is important when designing equitable learning communities.",
        limitations:
          "The study concerned one biological-sciences major and a particular learning-community design. Regression discontinuity estimates a local effect near an assignment threshold rather than a universal effect, and the friendship survey captured an early stage of network development.",
        tags: ["STEM education", "Friendship networks", "ERGM"],
      },
      "zh-hant": {
        title: "STEM學習社群促進友誼，但也可能造成學業網絡分隔",
        imageAlt: "按學習社群參與狀態形成群聚的有向STEM友誼網絡",
        summary:
          "一項準實驗研究發現，STEM學習社群擴大了參與者的友誼網絡，同時也使更多友誼集中在社群內部，呈現社會融入與網絡分隔並存的現象。",
        overview: [
          "研究檢視一年級STEM學習社群是否改變同一生物科學主修學生友誼網絡的規模、強度、結構與組成，並結合迴歸不連續設計和兩屆學生的關係資料。",
          "研究估計，參與社群令學生在主修內增加約一名朋友，但統計支持只屬邊緣顯著；社群內朋友的比例增加54個百分點。網絡也更依參與狀態分隔，而指數隨機圖模型支持共同選課透過增加互動機會促成連結的解釋。",
        ],
        howSnaWasUsed:
          "研究以網絡結果指標和指數隨機圖模型分析有向友誼提名。模型檢驗學習社群參與、共同選課、同質性、互惠性及網絡內生結構與友誼連結概率之間的關係。",
        nodes: "兩屆入學群組中主修生物科學的一年級學生。",
        ties: "第一學季結束時，一名學生對另一名學生作出的有向友誼提名。",
        methods:
          "準實驗迴歸不連續設計、有向友誼網絡指標，以及以statnet估計的分屆指數隨機圖模型。",
        keyTakeaways: [
          "研究估計，參與學習社群令學生在主修內增加約一名朋友，但統計支持只屬邊緣顯著。",
          "參與者在學習社群內的朋友比例估計增加54個百分點。",
          "課程促進社會融入，但也增加了按參與狀態形成的網絡分隔。",
        ],
        whyItMatters:
          "SNA呈現了個人層面結果可能忽略的政策取捨：一項課程可以幫助學生建立關係，同時令這些關係更集中於特定群體。這項區分對設計公平的學習社群非常重要。",
        limitations:
          "研究只涉及一個生物科學主修及特定學習社群設計。迴歸不連續所估計的是分配門檻附近的局部效果，而非普遍效果；友誼問卷也只捕捉網絡發展的早期階段。",
        tags: ["STEM教育", "友誼網絡", "指數隨機圖模型"],
      },
      "zh-hans": {
        title: "STEM学习共同体促进友谊，但也可能造成学业网络分隔",
        imageAlt: "按学习共同体参与状态形成聚类的有向STEM友谊网络",
        summary:
          "一项准实验研究发现，STEM学习共同体扩大了参与者的友谊网络，同时也使更多友谊集中在共同体内部，呈现社会融入与网络分隔并存的现象。",
        overview: [
          "研究考察一年级STEM学习共同体是否改变同一生物科学专业学生友谊网络的规模、强度、结构与组成，并结合回归不连续设计和两届学生的关系数据。",
          "研究估计，参与共同体使学生在专业内增加约一名朋友，但统计支持仅为边缘显著；共同体内朋友的比例增加54个百分点。网络也更按参与状态分隔，而指数随机图模型支持共同选课通过增加互动机会促成连接的解释。",
        ],
        howSnaWasUsed:
          "研究使用网络结果指标和指数随机图模型分析有向友谊提名。模型检验学习共同体参与、共同选课、同质性、互惠性及网络内生结构与友谊连接概率之间的关系。",
        nodes: "两届入学群体中主修生物科学的一年级学生。",
        ties: "第一学季结束时，一名学生对另一名学生作出的有向友谊提名。",
        methods:
          "准实验回归不连续设计、有向友谊网络指标，以及使用statnet估计的分届指数随机图模型。",
        keyTakeaways: [
          "研究估计，参与学习共同体使学生在专业内增加约一名朋友，但统计支持仅为边缘显著。",
          "参与者在学习共同体内的朋友比例估计增加54个百分点。",
          "课程促进社会融入，但也增加了按参与状态形成的网络分隔。",
        ],
        whyItMatters:
          "SNA呈现了个人层面结果可能忽略的政策权衡：一项课程可以帮助学生建立关系，同时使这些关系更集中于特定群体。这一区分对设计公平的学习共同体非常重要。",
        limitations:
          "研究只涉及一个生物科学专业和特定学习共同体设计。回归不连续所估计的是分配阈值附近的局部效应，而非普遍效应；友谊问卷也只捕捉网络发展的早期阶段。",
        tags: ["STEM教育", "友谊网络", "指数随机图模型"],
      },
    },
  },
  {
    id: "sna-003",
    sequence: 3,
    slug: "network-representation-and-centrality",
    type: "journal",
    authors: ["Mohammed Saqr", "Olga Viberg", "Henriikka Vartiainen"],
    venue:
      "International Journal of Computer-Supported Collaborative Learning",
    citation:
      "International Journal of Computer-Supported Collaborative Learning, 15, 227-248",
    doi: "10.1007/s11412-020-09322-6",
    sourceUrl:
      "https://link.springer.com/article/10.1007/s11412-020-09322-6",
    sourceLabel: "Springer Nature",
    publishedAt: "2020-07-06",
    year: 2020,
    reviewedAt: "2026-08-09",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-003-network-representation-and-centrality.png",
    summaryImage:
      "/images/news/summary/sna-003-network-representation-and-centrality-summary.png",
    localizations: {
      en: {
        title:
          "Capturing the participation and social dimensions of computer-supported collaborative learning through social network analysis: which method and measures matter?",
        imageAlt:
          "Three student-network representations comparing multigraph, weighted, and simplified ties",
        summary:
          "Across 12 university-course iterations, the study showed that network construction choices affect the robustness of centrality measures, with multigraph degree measures most consistent for participation and performance.",
        overview: [
          "The study addressed a reproducibility problem in learning analytics: researchers can turn the same discussion data into different networks, and those choices may change what centrality appears to measure. The dataset contained 13,428 interactions from 598 students in 12 medical higher-education course iterations.",
          "The authors compared multigraph, weighted, and simplified networks. Multigraph degree centralities were the most reliable indicators of participatory effort and consistent predictors of performance, while eigenvector centrality was the most consistent representation of the social dimension across configurations.",
        ],
        howSnaWasUsed:
          "Moodle reply data were reconstructed three ways: a multigraph retaining repeated ties and loops, a simplified graph removing them, and a weighted graph using posted text volume. In-degree, out-degree, closeness, betweenness, and eigenvector centrality were then compared for robustness and relation to learning measures.",
        nodes:
          "Five hundred ninety-eight students across 12 iterations of four medical higher-education courses.",
        ties:
          "A student's reply to another student in a problem-based learning discussion, represented differently in the three network configurations.",
        methods:
          "Multigraph, simplified, and text-weighted network construction; five centrality measures; robustness and reproducibility comparisons; and analyses against participation and performance.",
        keyTakeaways: [
          "Multigraph degree centralities most consistently represented participatory effort and predicted performance in these courses.",
          "Eigenvector centrality was the most stable indicator of the social dimension across network configurations.",
          "Changing how discussion traces became edges changed the reliability and interpretation of centrality results.",
        ],
        whyItMatters:
          "A network diagram is not a neutral transcription of activity. The study shows why researchers must justify edge construction and centrality selection before using SNA results to evaluate students or learning designs.",
        limitations:
          "The evidence came from Moodle-based problem-based learning in medical higher education and from particular operational definitions of participation, social interaction, and performance. The observed predictive relationships do not establish causal effects of network position.",
        tags: ["CSCL", "Network measurement", "Reproducibility"],
      },
      "zh-hant": {
        title:
          "透過社會網絡分析捕捉電腦支援協作學習的參與與社會面向：哪些方法和指標重要？",
        imageAlt: "比較多重圖、加權圖與簡化連結的三種學生網絡表示",
        summary:
          "研究比較12次大學課程開設資料，顯示網絡建構選擇會影響中心性指標的穩健性，其中多重圖的度中心性對參與和表現最為一致。",
        overview: [
          "研究處理學習分析中的可重現性問題：研究者可以把同一組討論資料轉換成不同網絡，而這些選擇可能改變中心性所代表的意義。資料包括醫學高等教育12次課程開設中598名學生的13,428次互動。",
          "作者比較多重圖、加權圖和簡化圖。多重圖的度中心性是參與投入最可靠的指標，也是表現最一致的預測變項；特徵向量中心性則是在不同配置下最穩定的社會面向表示。",
        ],
        howSnaWasUsed:
          "研究以三種方式重建Moodle回覆資料：保留重複連結與自環的多重圖、移除兩者的簡化圖，以及以發文文字量加權的網絡。其後比較入度、出度、接近、中介和特徵向量中心性的穩健性及其與學習指標的關係。",
        nodes: "四門醫學高等教育課程共12次開設中的598名學生。",
        ties: "學生在問題導向學習討論中對另一名學生的回覆，並在三種網絡配置中以不同方式表示。",
        methods:
          "多重圖、簡化圖與文字加權網絡建構，五項中心性指標，穩健性與可重現性比較，以及和參與及表現的關聯分析。",
        keyTakeaways: [
          "在這些課程中，多重圖的度中心性最一致地表示參與投入並預測表現。",
          "特徵向量中心性是在不同網絡配置下最穩定的社會面向指標。",
          "改變討論紀錄成為連結的方式，會改變中心性結果的可靠性與解釋。",
        ],
        whyItMatters:
          "網絡圖並不是對活動的中性抄錄。研究說明，研究者在使用SNA結果評估學生或學習設計前，必須先論證連結建構和中心性選擇。",
        limitations:
          "證據來自醫學高等教育中以Moodle支援的問題導向學習，也依賴對參與、社會互動和表現的特定操作定義。所觀察到的預測關係不能確立網絡位置的因果效果。",
        tags: ["電腦支援協作學習", "網絡測量", "可重現性"],
      },
      "zh-hans": {
        title:
          "通过社会网络分析捕捉计算机支持协作学习的参与和社会维度：哪些方法和指标重要？",
        imageAlt: "比较多重图、加权图和简化连接的三种学生网络表示",
        summary:
          "研究比较12次大学课程开设数据，显示网络构建选择会影响中心性指标的稳健性，其中多重图的度中心性对参与和表现最为一致。",
        overview: [
          "研究处理学习分析中的可重复性问题：研究者可以把同一组讨论数据转换成不同网络，而这些选择可能改变中心性所代表的意义。数据包括医学高等教育12次课程开设中598名学生的13,428次互动。",
          "作者比较多重图、加权图和简化图。多重图的度中心性是参与投入最可靠的指标，也是表现最一致的预测变量；特征向量中心性则是在不同配置下最稳定的社会维度表示。",
        ],
        howSnaWasUsed:
          "研究以三种方式重建Moodle回复数据：保留重复连接和自环的多重图、移除两者的简化图，以及按发文文本量加权的网络。随后比较入度、出度、接近、中介和特征向量中心性的稳健性及其与学习指标的关系。",
        nodes: "四门医学高等教育课程共12次开设中的598名学生。",
        ties: "学生在问题导向学习讨论中对另一名学生的回复，并在三种网络配置中以不同方式表示。",
        methods:
          "多重图、简化图与文本加权网络构建，五项中心性指标，稳健性和可重复性比较，以及与参与和表现的关联分析。",
        keyTakeaways: [
          "在这些课程中，多重图的度中心性最一致地表示参与投入并预测表现。",
          "特征向量中心性是在不同网络配置下最稳定的社会维度指标。",
          "改变讨论记录成为连接的方式，会改变中心性结果的可靠性与解释。",
        ],
        whyItMatters:
          "网络图并不是对活动的中性转录。研究说明，研究者在使用SNA结果评估学生或学习设计前，必须先论证连接构建和中心性选择。",
        limitations:
          "证据来自医学高等教育中由Moodle支持的问题导向学习，也依赖对参与、社会互动和表现的特定操作定义。所观察到的预测关系不能确立网络位置的因果效应。",
        tags: ["计算机支持协作学习", "网络测量", "可重复性"],
      },
    },
  },
  {
    id: "sna-002",
    sequence: 2,
    slug: "defining-social-learning-networks",
    type: "conference",
    authors: ["Alyssa Friend Wise", "Yi Cui", "Wan Qi Jin"],
    venue:
      "Seventh International Learning Analytics & Knowledge Conference (LAK '17)",
    citation:
      "Proceedings of the Seventh International Learning Analytics & Knowledge Conference, 383-392",
    doi: "10.1145/3027385.3027446",
    sourceUrl: "https://dl.acm.org/doi/10.1145/3027385.3027446",
    sourceLabel: "ACM Digital Library",
    publishedAt: "2017-03-13",
    year: 2017,
    reviewedAt: "2026-08-09",
    openAccess: false,
    coverImage:
      "/images/news/covers/sna-002-defining-social-learning-networks.png",
    summaryImage:
      "/images/news/summary/sna-002-defining-social-learning-networks-summary.png",
    localizations: {
      en: {
        title:
          "Honing in on social learning networks in MOOC forums: examining critical network definition decisions",
        imageAlt:
          "MOOC discussion network divided into content-related and non-content interactions",
        summary:
          "Analysis of 3,124 posts from 567 MOOC learners showed that separating content from non-content interaction changed network interpretation and that an overly broad copresence tie could inflate apparent status.",
        overview: [
          "MOOC forums contain replies about course ideas as well as social, logistical, and technical exchanges. The study asked whether these forms of interaction should be analyzed as one network and how five common definitions of a forum tie affect the resulting structure.",
          "The researchers classified 817 threads and built content-related, non-content, and unpartitioned networks from 3,124 posts by 567 participants. Content and non-content networks differed at network, community, and node levels; most tie definitions were less consequential, except Total Copresence, which produced distinct and potentially misleading status patterns.",
        ],
        howSnaWasUsed:
          "The study constructed separate interaction networks with Direct Reply, Star, Direct Reply plus Star, Limited Copresence, and Total Copresence ties. It then compared network-level structure, communities, and individual positions across content-related, non-content, and combined forum activity.",
        nodes: "Five hundred sixty-seven participants in a MOOC on statistics in medicine.",
        ties:
          "A forum relationship defined in five alternative ways, ranging from a direct reply to shared presence in the same discussion thread.",
        methods:
          "Automated content classification of 817 threads, five network tie definitions, and comparisons at network, community, and individual-node levels.",
        keyTakeaways: [
          "Content-related and non-content networks had meaningfully different structures and participant positions.",
          "Four tie definitions produced broadly less variation than the decision to separate content from non-content activity.",
          "Total Copresence could inflate the apparent status of superthread initiators, although that behavior may itself be analytically useful.",
        ],
        whyItMatters:
          "Forum logs do not contain one self-evident social network. SNA makes the consequences of boundary and tie-definition choices testable, helping analysts avoid conclusions that are artifacts of how they encoded the data.",
        limitations:
          "The evidence came from one medical-statistics MOOC and depended partly on automated thread classification. Forum traces omit interaction outside the platform, and the structural comparisons do not establish effects on learning or achievement.",
        tags: ["MOOCs", "Network construction", "Learning analytics"],
      },
      "zh-hant": {
        title: "聚焦MOOC論壇中的社會學習網絡：檢視關鍵網絡定義決策",
        imageAlt: "分為課程內容相關與非內容互動的MOOC討論網絡",
        summary:
          "對567名MOOC學習者的3,124篇貼文進行分析後，研究發現把內容互動與非內容互動分開會改變網絡解釋，而過度寬泛的共同出現連結可能誇大表面地位。",
        overview: [
          "MOOC論壇既有關於課程概念的回覆，也有社交、行政和技術交流。研究探問這些互動是否應視為同一個網絡，以及五種常見論壇連結定義如何影響所得結構。",
          "研究者分類817個討論串，並以567名參與者的3,124篇貼文建立內容相關、非內容及未分割網絡。兩類網絡在整體、社群與節點層面均有差異；大多數連結定義影響較小，但完全共同出現產生了獨特且可能誤導的地位形態。",
        ],
        howSnaWasUsed:
          "研究分別以直接回覆、星狀、直接回覆加星狀、有限共同出現及完全共同出現建立互動網絡，再比較內容相關、非內容及合併活動的整體結構、社群和個人位置。",
        nodes: "一門醫學統計MOOC中的567名參與者。",
        ties: "以五種替代方式定義的論壇關係，範圍從直接回覆到共同出現在同一討論串。",
        methods:
          "817個討論串的自動內容分類、五種網絡連結定義，以及整體網絡、社群和個別節點層面的比較。",
        keyTakeaways: [
          "內容相關與非內容網絡在結構和參與者位置上具有實質差異。",
          "相較於是否分隔內容與非內容活動，四種連結定義帶來的差異普遍較小。",
          "完全共同出現可能誇大大型討論串發起者的表面地位，但這種現象本身也可成為分析線索。",
        ],
        whyItMatters:
          "論壇紀錄並不包含一個不證自明的社會網絡。SNA可檢驗邊界與連結定義選擇的後果，幫助分析者避免把資料編碼方式造成的現象誤當成研究結論。",
        limitations:
          "證據來自單一醫學統計MOOC，並部分依賴自動討論串分類。論壇紀錄沒有涵蓋平台外互動，而結構比較也不能確立對學習或成績的影響。",
        tags: ["大型開放式線上課程", "網絡建構", "學習分析"],
      },
      "zh-hans": {
        title: "聚焦MOOC论坛中的社会学习网络：考察关键网络定义决策",
        imageAlt: "分为课程内容相关和非内容互动的MOOC讨论网络",
        summary:
          "对567名MOOC学习者的3,124篇帖子进行分析后，研究发现把内容互动与非内容互动分开会改变网络解释，而过度宽泛的共同出现连接可能夸大表面地位。",
        overview: [
          "MOOC论坛既有关于课程概念的回复，也有社交、行政和技术交流。研究探问这些互动是否应视为同一个网络，以及五种常见论坛连接定义如何影响所得结构。",
          "研究者分类817个讨论串，并用567名参与者的3,124篇帖子建立内容相关、非内容和未分割网络。两类网络在整体、社群与节点层面均有差异；大多数连接定义影响较小，但完全共同出现产生了独特且可能误导的地位形态。",
        ],
        howSnaWasUsed:
          "研究分别以直接回复、星状、直接回复加星状、有限共同出现和完全共同出现建立互动网络，再比较内容相关、非内容和合并活动的整体结构、社群和个人位置。",
        nodes: "一门医学统计MOOC中的567名参与者。",
        ties: "以五种替代方式定义的论坛关系，范围从直接回复到共同出现在同一讨论串。",
        methods:
          "817个讨论串的自动内容分类、五种网络连接定义，以及整体网络、社群和个别节点层面的比较。",
        keyTakeaways: [
          "内容相关与非内容网络在结构和参与者位置上具有实质差异。",
          "与是否分隔内容和非内容活动相比，四种连接定义带来的差异普遍较小。",
          "完全共同出现可能夸大大型讨论串发起者的表面地位，但这种现象本身也可成为分析线索。",
        ],
        whyItMatters:
          "论坛记录并不包含一个不证自明的社会网络。SNA可以检验边界和连接定义选择的后果，帮助分析者避免把数据编码方式造成的现象误当作研究结论。",
        limitations:
          "证据来自单一医学统计MOOC，并部分依赖自动讨论串分类。论坛记录没有涵盖平台外互动，而结构比较也不能确立对学习或成绩的影响。",
        tags: ["大规模开放在线课程", "网络构建", "学习分析"],
      },
    },
  },
  {
    id: "sna-001",
    sequence: 1,
    slug: "course-networking-and-community",
    type: "conference",
    authors: ["Adrienne L. Traxler", "Andrew Gavrin", "Rebecca S. Lindell"],
    venue: "Physics Education Research Conference 2016",
    citation: "Physics Education Research Conference 2016 Proceedings, 352-355",
    doi: "10.1119/perc.2016.pr.083",
    sourceUrl: "https://www.per-central.org/items/detail.cfm?ID=14268",
    sourceLabel: "PER-Central",
    publishedAt: "2016-12-29",
    year: 2016,
    reviewedAt: "2026-08-09",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-001-course-networking-and-community.png",
    summaryImage:
      "/images/news/summary/sna-001-course-networking-and-community-summary.png",
    localizations: {
      en: {
        title:
          "CourseNetworking and community: Linking online discussion networks and course success",
        imageAlt:
          "Introductory physics discussion network with central and peripheral students",
        summary:
          "An introductory-physics forum was modeled as a student network to test whether central discussion positions aligned with final grades. The study found no strong correlation, offering an important caution for learning analytics.",
        overview: [
          "Online forums can give commuter and non-traditional students a way to participate in a course community outside class. The study examined whether structural position in one introductory-physics discussion forum was linked to final course outcomes.",
          "Students and discussion threads were first represented as a two-mode network, then projected into a weighted student network based on shared thread participation. Contrary to the researchers' expectation, forum-network centrality did not show a strong relationship with final grades.",
        ],
        howSnaWasUsed:
          "The forum was represented as a bipartite network of student actors and discussion-thread events. Its weighted student projection captured mutual thread participation, allowing the researchers to compare central and peripheral network positions with final course grades.",
        nodes: "Students participating in an introductory-physics online discussion forum.",
        ties:
          "A weighted connection between students based on their mutual participation in discussion threads.",
        methods:
          "Two-mode actor-event network construction, weighted student projection, centrality analysis, and comparison with final course grades.",
        keyTakeaways: [
          "The forum created a measurable discussion community extending beyond scheduled class time.",
          "SNA distinguished structurally central participation from simple activity totals.",
          "Network centrality was not strongly correlated with final grades in this course.",
        ],
        whyItMatters:
          "The null result is useful evidence: being central in an online discussion network is not automatically equivalent to learning more or earning a higher grade. Measures need to match the learning process they are intended to represent.",
        limitations:
          "The report covered one introductory-physics context and was published as a short conference paper. Shared participation in a thread does not necessarily mean direct interaction or knowledge exchange, and a final grade is a broad outcome influenced by many factors.",
        tags: ["Physics education", "Discussion forums", "Null findings"],
      },
      "zh-hant": {
        title: "CourseNetworking與社群：連結線上討論網絡和課程成果",
        imageAlt: "同時包含中心與周邊學生的大學基礎物理討論網絡",
        summary:
          "研究把大學基礎物理論壇建模為學生網絡，以檢驗討論中的中心位置是否與期末成績一致。研究未發現強相關，為學習分析提供重要提醒。",
        overview: [
          "線上論壇可讓通勤生和非傳統學生在課堂以外參與課程社群。研究檢視一個大學基礎物理討論論壇中的結構位置是否與期末課程成果相關。",
          "研究先把學生和討論串表示為二模網絡，再根據共同參與討論串投影成加權學生網絡。與研究者原先預期不同，論壇網絡中心性與期末成績沒有強關係。",
        ],
        howSnaWasUsed:
          "研究把論壇表示為由學生行動者和討論串事件構成的二分網絡。其加權學生投影捕捉共同參與討論串的情況，讓研究者比較中心與周邊網絡位置和期末成績。",
        nodes: "參與大學基礎物理線上討論論壇的學生。",
        ties: "根據學生共同參與討論串而建立的加權連結。",
        methods:
          "二模行動者與事件網絡建構、加權學生投影、中心性分析，以及與期末課程成績的比較。",
        keyTakeaways: [
          "論壇形成了一個可測量、延伸至正式課堂時間以外的討論社群。",
          "SNA能把結構上的中心參與和單純活動總量區分開來。",
          "在這門課程中，網絡中心性與期末成績沒有強相關。",
        ],
        whyItMatters:
          "這項零結果是有用的證據：在線上討論網絡中處於中心，不等於必然學得更多或取得更高成績。指標必須配合它所要表示的學習過程。",
        limitations:
          "報告只涵蓋一個大學基礎物理情境，並以短篇會議論文形式發表。共同參與討論串不一定代表直接互動或知識交流，而期末成績亦是受多種因素影響的廣泛結果。",
        tags: ["物理教育", "討論論壇", "零結果"],
      },
      "zh-hans": {
        title: "CourseNetworking与社群：连接在线讨论网络和课程成果",
        imageAlt: "同时包含中心和外围学生的大学基础物理讨论网络",
        summary:
          "研究把大学基础物理论坛建模为学生网络，以检验讨论中的中心位置是否与期末成绩一致。研究未发现强相关，为学习分析提供重要提醒。",
        overview: [
          "在线论坛可以让通勤生和非传统学生在课堂以外参与课程社群。研究考察一个大学基础物理讨论论坛中的结构位置是否与期末课程成果相关。",
          "研究先把学生和讨论串表示为二模网络，再根据共同参与讨论串投影为加权学生网络。与研究者原先预期不同，论坛网络中心性与期末成绩没有强关系。",
        ],
        howSnaWasUsed:
          "研究把论坛表示为由学生行动者和讨论串事件构成的二分网络。其加权学生投影捕捉共同参与讨论串的情况，使研究者能够比较中心与外围网络位置和期末成绩。",
        nodes: "参与大学基础物理在线讨论论坛的学生。",
        ties: "根据学生共同参与讨论串而建立的加权连接。",
        methods:
          "二模行动者与事件网络构建、加权学生投影、中心性分析，以及与期末课程成绩的比较。",
        keyTakeaways: [
          "论坛形成了一个可测量、延伸至正式课堂时间以外的讨论社群。",
          "SNA能够把结构上的中心参与和简单活动总量区分开来。",
          "在这门课程中，网络中心性与期末成绩没有强相关。",
        ],
        whyItMatters:
          "这项零结果是有用的证据：在在线讨论网络中处于中心，不等于必然学得更多或取得更高成绩。指标必须匹配它所要表示的学习过程。",
        limitations:
          "报告只涵盖一个大学基础物理情境，并以短篇会议论文形式发表。共同参与讨论串不一定代表直接互动或知识交流，而期末成绩也是受多种因素影响的广泛结果。",
        tags: ["物理教育", "讨论论坛", "零结果"],
      },
    },
  },
];

export const newsYears: number[] = Array.from(
  new Set(newsArticles.map((article) => article.year)),
).sort((a, b) => b - a);

export function getNewsArticle(slugOrId: string): NewsArticleRecord | undefined {
  return newsArticles.find(
    (article) => article.slug === slugOrId || article.id === slugOrId,
  );
}

export function localizeNewsArticle(
  article: NewsArticleRecord,
  locale: Locale,
): LocalizedNewsArticle {
  const { localizations, ...metadata } = article;

  return {
    ...metadata,
    ...localizations[locale],
  };
}

export function getRelatedNewsArticles(
  article: NewsArticleRecord,
  limit?: number,
): NewsArticleRecord[];
export function getRelatedNewsArticles(
  article: NewsArticleRecord,
  locale: Locale,
  limit?: number,
): LocalizedNewsArticle[];
export function getRelatedNewsArticles(
  article: NewsArticleRecord,
  localeOrLimit: Locale | number = 3,
  requestedLimit = 3,
): NewsArticleRecord[] | LocalizedNewsArticle[] {
  const limit =
    typeof localeOrLimit === "number" ? localeOrLimit : requestedLimit;
  const safeLimit = Math.max(0, Math.floor(limit));
  const related = newsArticles
    .filter((candidate) => candidate.id !== article.id)
    .sort((a, b) => {
      const typeDifference =
        Number(b.type === article.type) - Number(a.type === article.type);

      if (typeDifference !== 0) {
        return typeDifference;
      }

      const yearDifference =
        Math.abs(a.year - article.year) - Math.abs(b.year - article.year);

      if (yearDifference !== 0) {
        return yearDifference;
      }

      return b.sequence - a.sequence;
    })
    .slice(0, safeLimit);

  return typeof localeOrLimit === "string"
    ? related.map((candidate) => localizeNewsArticle(candidate, localeOrLimit))
    : related;
}
