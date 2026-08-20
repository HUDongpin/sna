import type {
  NewsArticleLocalization,
  NewsArticleRecord,
} from "@/lib/news-types";

type Language = "en" | "zh-hant" | "zh-hans";

type NewsText = {
  title: string;
  imageAlt: string;
  summary: string;
  actors: string;
  relations: string;
  analysis: string;
  finding: string;
  value: string;
  caveat: string;
  tags: [string, string, string];
};

type BackfillPaper = Omit<NewsArticleRecord, "localizations"> & {
  text: Record<Language, NewsText>;
};

function createLocalization(
  text: NewsText,
  language: Language,
): NewsArticleLocalization {
  const design =
    language === "en"
      ? "The study defined " + text.actors + " as nodes and " + text.relations + " as ties. " + text.analysis
      : language === "zh-hant"
        ? "研究把" + text.actors + "界定為節點，把" + text.relations + "界定為連結。" + text.analysis
        : "研究把" + text.actors + "界定为节点，把" + text.relations + "界定为连接。" + text.analysis;
  const designTakeaway =
    language === "en"
      ? "The result depends on the stated node boundary, tie definition, observation window, and analysis choices rather than on activity counts alone."
      : language === "zh-hant"
        ? "結果取決於明確的節點邊界、連結定義、觀察時間窗及分析選擇，而不能只靠活動次數解讀。"
        : "结果取决于明确的节点边界、连接定义、观察时间窗及分析选择，而不能只靠活动次数解读。";

  return {
    title: text.title,
    imageAlt: text.imageAlt,
    summary: text.summary,
    overview: [
      text.summary + " " + text.value,
      text.finding + " " + text.caveat,
    ],
    howSnaWasUsed: design,
    nodes: text.actors,
    ties: text.relations,
    methods: text.analysis,
    keyTakeaways: [text.finding, designTakeaway, text.caveat],
    whyItMatters: text.value,
    limitations: text.caveat,
    tags: text.tags,
  };
}

function createArticle(paper: BackfillPaper): NewsArticleRecord {
  const { text, ...metadata } = paper;
  return {
    ...metadata,
    localizations: {
      en: createLocalization(text.en, "en"),
      "zh-hant": createLocalization(text["zh-hant"], "zh-hant"),
      "zh-hans": createLocalization(text["zh-hans"], "zh-hans"),
    },
  };
}

const papers: BackfillPaper[] = [
  {
    id: "sna-013",
    sequence: 13,
    slug: "informal-peer-learning-dental-networks",
    type: "journal",
    authors: [
      "M. AbdelSalam",
      "Maha El Tantawi",
      "Asim Al-Ansari",
      "Adel AlAgl",
      "Ghada Al-Harbi",
    ],
    venue: "Medical Principles and Practice",
    citation: "Medical Principles and Practice, 26(4), 337-342",
    doi: "10.1159/000477731",
    sourceUrl:
      "https://karger.com/mpp/article/26/4/337/204309/Informal-Peer-Assisted-Learning-Groups-Did-Not",
    sourceLabel: "Medical Principles and Practice",
    publishedAt: "2017-05-23",
    year: 2017,
    reviewedAt: "2026-07-23",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-013-informal-peer-learning-dental-networks.png",
    summaryImage:
      "/images/news/summary/sna-013-informal-peer-learning-dental-networks-summary.png",
    text: {
      en: {
        title:
          "Informal peer-assisted learning groups and dental exam performance: A network test",
        imageAlt:
          "Photograph of diverse dental students studying in small groups in a simulation clinic, with subtle network lines connecting peer circles",
        summary:
          "Seventy-four of 92 invited fourth-year dental students reported self-formed peer-learning groups and friendship relations before a 22-item examination. Network and regression analyses found prior academic performance was the clearest predictor, while group structure and peer similarity did not show a dependable advantage.",
        actors:
          "fourth-year dental students who responded to the peer-learning and friendship survey",
        relations:
          "undirected co-membership and reported friendship links within self-formed study groups of two to four students",
        analysis:
          "The authors visualized the network in Gephi, calculated degree-based positions, described group composition, and used regression models to compare network membership and prior grades with examination performance.",
        finding:
          "Prior grade remained the dominant predictor; belonging to a group with friends showed only weak evidence, and neither similarity nor the observed small-group structure consistently improved scores.",
        value:
          "The study is a useful negative finding because it separates the existence of peer ties from evidence that those ties improve learning, discouraging educators from treating any visible study group as an effective intervention.",
        caveat:
          "This was one dental class with 74 respondents, self-reported relations, very small self-selected groups, a short observation period, gender segregation, and no randomized comparison. The analysis is correlational and cannot show that friendship or group membership caused examination outcomes.",
        tags: ["Dental education", "Peer learning", "Friendship networks"],
      },
      "zh-hant": {
        title: "非正式同儕輔助學習小組與牙科考試表現：一項網絡檢驗",
        imageAlt:
          "真人照片呈現多元牙科學生在模擬診所分成小組溫習，細緻網絡線連接不同同儕圈子",
        summary:
          "92名受邀四年級牙科生中有74人，在22題考試前報告自組同儕學習小組及友誼關係。網絡與迴歸分析顯示，既往學業表現是最清楚的預測因素，小組結構與同儕相似性並未呈現可靠優勢。",
        actors: "完成同儕學習及友誼問卷的四年級牙科學生",
        relations: "由兩至四人自組溫習小組的無向共同成員關係及學生報告的友誼連結",
        analysis:
          "作者以Gephi呈現網絡、計算以度數為基礎的位置、描述小組組成，並利用迴歸模型比較網絡成員身分、既往成績與考試表現。",
        finding:
          "既往成績仍是主要預測因素；與朋友同組只有微弱證據，而相似性及觀察所得的小組結構均未能一致改善分數。",
        value:
          "這項有用的零結果把同儕連結的存在與連結能改善學習的證據分開，提醒教育者不可把任何可見溫習小組直接當作有效介入。",
        caveat:
          "研究只涵蓋一個牙科班別、74名回應者、自陳關係、極小型自選小組及短觀察期，亦存在性別分隔而沒有隨機比較。分析屬相關性質，不能證明友誼或小組成員身分造成考試結果。",
        tags: ["牙科教育", "同儕學習", "友誼網絡"],
      },
      "zh-hans": {
        title: "非正式同伴辅助学习小组与牙科考试表现：一项网络检验",
        imageAlt:
          "真人照片呈现多元牙科学生在模拟诊所分成小组复习，细致网络线连接不同同伴圈子",
        summary:
          "92名受邀四年级牙科生中有74人，在22题考试前报告自组同伴学习小组及友谊关系。网络与回归分析显示，既往学业表现是最清楚的预测因素，小组结构与同伴相似性并未呈现可靠优势。",
        actors: "完成同伴学习及友谊问卷的四年级牙科学生",
        relations: "由两至四人自组复习小组的无向共同成员关系及学生报告的友谊连接",
        analysis:
          "作者用Gephi呈现网络、计算以度数为基础的位置、描述小组组成，并利用回归模型比较网络成员身份、既往成绩与考试表现。",
        finding:
          "既往成绩仍是主要预测因素；与朋友同组只有微弱证据，而相似性及观察到的小组结构均未能一致改善分数。",
        value:
          "这项有用的零结果把同伴连接的存在与连接能改善学习的证据分开，提醒教育者不可把任何可见复习小组直接当作有效干预。",
        caveat:
          "研究只涵盖一个牙科班级、74名回应者、自报关系、极小型自选小组及短观察期，也存在性别分隔而没有随机比较。分析属于相关性质，不能证明友谊或小组成员身份造成考试结果。",
        tags: ["牙科教育", "同伴学习", "友谊网络"],
      },
    },
  },
  {
    id: "sna-014",
    sequence: 14,
    slug: "monitor-online-collaboration-informed-intervention",
    type: "journal",
    authors: ["Mohammed Saqr", "Uno Fors", "Matti Tedre", "Jalal Nouri"],
    venue: "PLOS ONE",
    citation: "PLOS ONE, 13(3), e0194777",
    doi: "10.1371/journal.pone.0194777",
    sourceUrl: "https://doi.org/10.1371/journal.pone.0194777",
    sourceLabel: "PLOS ONE",
    publishedAt: "2018-03-22",
    year: 2018,
    reviewedAt: "2026-07-24",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-014-monitor-online-collaboration-informed-intervention.png",
    summaryImage:
      "/images/news/summary/sna-014-monitor-online-collaboration-informed-intervention-summary.png",
    text: {
      en: {
        title:
          "Monitoring online collaborative learning networks to guide an informed intervention",
        imageAlt:
          "Photograph of an instructor and university students in a seminar room, with a network overlay shifting from teacher-centered to distributed peer coordination",
        summary:
          "Interaction logs from three medical courses with 82 students and three teachers were mapped before and after a mid-course intervention. Participation roles, density, in-degree, and clustering increased after five targeted teaching actions, but the observational time comparison cannot isolate the intervention from normal course development.",
        actors: "students and teachers participating in three online medical courses",
        relations:
          "directed discussion interactions recorded by the learning platform before and after the mid-course change",
        analysis:
          "The study combined network visualizations, density, degree and clustering measures with participation-role classifications, then compared the pre-midterm and post-midterm network periods.",
        finding:
          "Active network roles increased from 15 to 40 while non-participatory roles fell from 67 to 32, and the later networks showed higher density, in-degree, and clustering.",
        value:
          "The paper demonstrates how interpretable network diagnostics can inform support while a course is still running, instead of waiting for final grades or using raw message counts alone.",
        caveat:
          "The three courses were not randomized and had no concurrent untreated control. Instructor actions, assessment timing, maturation, and changing course demands coincide with the before-after contrast, so the observed network shift cannot be attributed causally to the intervention.",
        tags: ["Learning analytics", "Network intervention", "Online PBL"],
      },
      "zh-hant": {
        title: "監測線上協作學習網絡以引導有根據的介入",
        imageAlt:
          "真人照片呈現導師與大學生在研討室協作，網絡疊圖由教師中心轉向分散的同儕協調",
        summary:
          "研究把三門醫學課程共82名學生及3名教師的互動紀錄，繪成期中介入前後網絡。五項針對性教學行動後，參與角色、密度、入度及聚類均上升，但觀察性時間比較不能把介入效果與課程自然發展分開。",
        actors: "參與三門線上醫學課程的學生及教師",
        relations: "學習平台在期中改動前後記錄的有向討論互動",
        analysis:
          "研究把網絡視覺化、密度、度數及聚類指標與參與角色分類結合，然後比較期中考前後兩個網絡時段。",
        finding:
          "活躍網絡角色由15個增至40個，非參與角色由67個降至32個，後期網絡亦呈現較高密度、入度及聚類。",
        value:
          "論文示範如何在課程仍進行時，用可解釋網絡診斷引導支援，而非只等待期末成績或依賴訊息總數。",
        caveat:
          "三門課程沒有隨機分配，也沒有同期未介入對照組。教師行動、評核時間、自然成熟及課程要求變化均與前後比較重疊，因此不能把觀察所得網絡轉變因果歸於介入。",
        tags: ["學習分析", "網絡介入", "線上問題導向學習"],
      },
      "zh-hans": {
        title: "监测在线协作学习网络以引导有依据的干预",
        imageAlt:
          "真人照片呈现教师与大学生在研讨室协作，网络叠图由教师中心转向分散的同伴协调",
        summary:
          "研究把三门医学课程共82名学生及3名教师的互动记录，绘成期中干预前后网络。五项针对性教学行动后，参与角色、密度、入度及聚类均上升，但观察性时间比较不能把干预效果与课程自然发展分开。",
        actors: "参与三门在线医学课程的学生及教师",
        relations: "学习平台在期中改动前后记录的有向讨论互动",
        analysis:
          "研究把网络可视化、密度、度数及聚类指标与参与角色分类结合，然后比较期中考试前后两个网络时段。",
        finding:
          "活跃网络角色由15个增至40个，非参与角色由67个降至32个，后期网络也呈现更高密度、入度及聚类。",
        value:
          "论文示范如何在课程仍进行时，用可解释网络诊断引导支持，而不是只等待期末成绩或依赖消息总数。",
        caveat:
          "三门课程没有随机分配，也没有同期未干预对照组。教师行动、评估时间、自然成熟及课程要求变化均与前后比较重叠，因此不能把观察到的网络转变因果归于干预。",
        tags: ["学习分析", "网络干预", "在线问题导向学习"],
      },
    },
  },
  {
    id: "sna-015",
    sequence: 15,
    slug: "mathematics-professional-development-message-networks",
    type: "journal",
    authors: ["Charles N. Hayward", "Sandra L. Laursen"],
    venue: "International Journal of STEM Education",
    citation: "International Journal of STEM Education, 5, Article 28",
    doi: "10.1186/s40594-018-0120-9",
    sourceUrl:
      "https://link.springer.com/article/10.1186/s40594-018-0120-9",
    sourceLabel: "International Journal of STEM Education",
    publishedAt: "2018-07-02",
    year: 2018,
    reviewedAt: "2026-07-25",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-015-mathematics-professional-development-message-networks.png",
    summaryImage:
      "/images/news/summary/sna-015-mathematics-professional-development-message-networks-summary.png",
    text: {
      en: {
        title:
          "Supporting mathematics instructional change through professional-development message networks",
        imageAlt:
          "Photograph of mathematics teachers collaborating with manipulatives at workshop tables, connected by colored message paths",
        summary:
          "A year-long listserv following an inquiry-based mathematics workshop linked qualitative coding with SNA. Thirty-five participants and 11 facilitators exchanged 281 messages; question and follow-up patterns sustained discussion, and 47 percent of messages included a community-building function.",
        actors:
          "the 281 listserv messages exchanged by workshop participants and facilitators during the follow-up year",
        relations:
          "directed coded response links from each message to earlier messages it answered, thanked, extended, or revisited",
        analysis:
          "Messages and response functions were manually coded, arranged as conversation networks, and analyzed for parents, children, ancestors, descendants, reach, timing, and sender role using R network packages and group comparisons.",
        finding:
          "Thirty-two of 35 participants posted, 81 percent of responses arrived within two days, follow-up messages revived older threads, and nearly half of all messages contained primary or ancillary community building.",
        value:
          "Treating messages rather than people as nodes reveals how support unfolds through conversational sequences and shows which facilitation moves help a professional-learning community remain responsive.",
        caveat:
          "The study examined one workshop cohort and one closed listserv, excluded private conversations, relied on interpretive coding of response functions, and did not compare instructional or student outcomes with a control group. The network patterns describe support processes, not causal effects of professional development.",
        tags: ["Faculty development", "Message networks", "Mixed methods"],
      },
      "zh-hant": {
        title: "透過專業發展訊息網絡支援數學教學轉變",
        imageAlt:
          "真人照片呈現數學教師在工作坊桌上利用教具協作，彩色訊息路徑連接不同參與者",
        summary:
          "一個探究式數學工作坊後的一年期郵件群組研究，把質性編碼與SNA結合。35名參與者與11名引導者交換281則訊息；提問與跟進模式維持討論，而47%的訊息包含社群建立功能。",
        actors: "工作坊參與者與引導者在跟進一年交換的281則郵件群組訊息",
        relations: "由每則訊息指向其回答、致謝、延伸或再次跟進之較早訊息的有向編碼回應連結",
        analysis:
          "研究人工編碼訊息及回應功能，把它們排列成對話網絡，並利用R網絡套件與組別比較分析父、子、祖先、後代、觸及範圍、時間及發送者角色。",
        finding:
          "35名參與者中有32人發文，81%的回應在兩天內出現，跟進訊息重啟舊對話，而近半訊息包含主要或附帶的社群建立功能。",
        value:
          "把訊息而非人物當作節點，可呈現支援如何沿對話序列展開，並顯示哪些引導行動有助專業學習社群保持回應。",
        caveat:
          "研究只涵蓋一個工作坊群組及一個封閉郵件群組，未納入私人對話，並依賴對回應功能的詮釋編碼，也沒有以對照組比較教學或學生成果。網絡模式描述支援過程，而非專業發展的因果效果。",
        tags: ["教師專業發展", "訊息網絡", "混合方法"],
      },
      "zh-hans": {
        title: "通过专业发展消息网络支持数学教学转变",
        imageAlt:
          "真人照片呈现数学教师在工作坊桌上利用教具协作，彩色消息路径连接不同参与者",
        summary:
          "一个探究式数学工作坊后的一年期邮件群组研究，把质性编码与SNA结合。35名参与者与11名引导者交换281则消息；提问与跟进模式维持讨论，而47%的消息包含社群建设功能。",
        actors: "工作坊参与者与引导者在跟进一年交换的281则邮件群组消息",
        relations: "由每则消息指向其回答、致谢、延伸或再次跟进之较早消息的有向编码回应连接",
        analysis:
          "研究人工编码消息及回应功能，把它们排列成对话网络，并利用R网络包与组别比较分析父、子、祖先、后代、触及范围、时间及发送者角色。",
        finding:
          "35名参与者中有32人发帖，81%的回应在两天内出现，跟进消息重启旧对话，而近半消息包含主要或附带的社群建设功能。",
        value:
          "把消息而非人物当作节点，可呈现支持如何沿对话序列展开，并显示哪些引导行动有助专业学习社群保持回应。",
        caveat:
          "研究只涵盖一个工作坊群组及一个封闭邮件群组，未纳入私人对话，并依赖对回应功能的解释编码，也没有以对照组比较教学或学生成果。网络模式描述支持过程，而非专业发展的因果效果。",
        tags: ["教师专业发展", "消息网络", "混合方法"],
      },
    },
  },
  {
    id: "sna-016",
    sequence: 16,
    slug: "online-pbl-networks-predict-performance",
    type: "journal",
    authors: ["Mohammed Saqr", "Uno Fors", "Jalal Nouri"],
    venue: "PLOS ONE",
    citation: "PLOS ONE, 13(9), e0203590",
    doi: "10.1371/journal.pone.0203590",
    sourceUrl: "https://doi.org/10.1371/journal.pone.0203590",
    sourceLabel: "PLOS ONE",
    publishedAt: "2018-09-20",
    year: 2018,
    reviewedAt: "2026-07-26",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-016-online-pbl-networks-predict-performance.png",
    summaryImage:
      "/images/news/summary/sna-016-online-pbl-networks-predict-performance-summary.png",
    text: {
      en: {
        title:
          "Using online problem-based learning networks to understand and predict performance",
        imageAlt:
          "Photograph of medical students in hybrid problem-based learning groups, with four network overlays leading to an uncertainty display",
        summary:
          "Across four online problem-based learning courses, interaction networks were linked with grades through correlations and regression, then checked on the next year's course data. Denser group interaction, cohesion, and ties to prominent peers were associated with performance, and a classifier reported 93.3 percent accuracy.",
        actors: "students and tutors participating in four online problem-based learning courses",
        relations:
          "directed replies and discussion interactions captured by the learning platform within each course and group",
        analysis:
          "The authors calculated individual centralities, group density and cohesion, visualized course networks, tested grade associations, built regression and classification models, and evaluated the selected predictors on a subsequent-year dataset.",
        finding:
          "Moderate-to-strong associations appeared across the studied courses, and the next-year validation supported the selected network predictors; tutor interaction was negatively associated with grades, plausibly because tutors responded more to struggling groups.",
        value:
          "The study shows how relational features can add context to early-support models, while its interpretation also warns that an alert should trigger assistance rather than label a learner as deficient.",
        caveat:
          "The courses came from one educational setting and the models use observational platform traces rather than randomized exposure. Prediction accuracy depends on class balance, threshold, course design, and future similarity; correlation and prediction do not establish that changing centrality would change grades.",
        tags: ["Online PBL", "Performance prediction", "Learning networks"],
      },
      "zh-hant": {
        title: "利用線上問題導向學習網絡理解及預測表現",
        imageAlt:
          "真人照片呈現醫學生參與混合式問題導向學習小組，四個網絡疊圖連向不確定性顯示",
        summary:
          "研究在四門線上問題導向學習課程中，以相關及迴歸連結互動網絡與成績，再用下一年度課程資料檢查。較密集的小組互動、凝聚及連向顯著同儕均與表現相關，分類器報告93.3%準確率。",
        actors: "參與四門線上問題導向學習課程的學生及導師",
        relations: "學習平台在每門課程及小組內捕捉的有向回覆與討論互動",
        analysis:
          "作者計算個人中心性、小組密度及凝聚，呈現課程網絡，檢驗成績關聯，建立迴歸與分類模型，並以翌年資料評估所選預測因素。",
        finding:
          "各課程出現中度至強度關聯，翌年驗證支持所選網絡預測因素；導師互動與成績呈負相關，可能是導師較常回應遇到困難的小組。",
        value:
          "研究顯示關係特徵如何為早期支援模型增加情境，同時提醒警示應啟動協助，而非把學習者標籤為能力不足。",
        caveat:
          "課程來自單一教育情境，模型使用觀察所得平台軌跡而非隨機暴露。預測準確率取決於類別比例、門檻、課程設計及未來相似度；相關與預測不能證明改變中心性會改變成績。",
        tags: ["線上問題導向學習", "表現預測", "學習網絡"],
      },
      "zh-hans": {
        title: "利用在线问题导向学习网络理解及预测表现",
        imageAlt:
          "真人照片呈现医学生参与混合式问题导向学习小组，四个网络叠图连向不确定性显示",
        summary:
          "研究在四门在线问题导向学习课程中，以相关及回归连接互动网络与成绩，再用下一年度课程数据检查。较密集的小组互动、凝聚及连向显著同伴均与表现相关，分类器报告93.3%准确率。",
        actors: "参与四门在线问题导向学习课程的学生及导师",
        relations: "学习平台在每门课程及小组内捕捉的有向回复与讨论互动",
        analysis:
          "作者计算个人中心性、小组密度及凝聚，呈现课程网络，检验成绩关联，建立回归与分类模型，并用下一年数据评估所选预测因素。",
        finding:
          "各课程出现中度至强度关联，下一年验证支持所选网络预测因素；导师互动与成绩呈负相关，可能是导师更常回应遇到困难的小组。",
        value:
          "研究显示关系特征如何为早期支持模型增加情境，同时提醒预警应启动帮助，而不是把学习者标记为能力不足。",
        caveat:
          "课程来自单一教育情境，模型使用观察到的平台轨迹而非随机暴露。预测准确率取决于类别比例、阈值、课程设计及未来相似度；相关与预测不能证明改变中心性会改变成绩。",
        tags: ["在线问题导向学习", "表现预测", "学习网络"],
      },
    },
  },
  {
    id: "sna-017",
    sequence: 17,
    slug: "medical-pbl-interaction-networks-performance",
    type: "journal",
    authors: ["Mohammed Saqr", "Hani Alamro"],
    venue: "BMC Medical Education",
    citation: "BMC Medical Education, 19, Article 160",
    doi: "10.1186/s12909-019-1599-6",
    sourceUrl:
      "https://link.springer.com/article/10.1186/s12909-019-1599-6",
    sourceLabel: "BMC Medical Education",
    publishedAt: "2019-05-22",
    year: 2019,
    reviewedAt: "2026-07-27",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-017-medical-pbl-interaction-networks-performance.png",
    summaryImage:
      "/images/news/summary/sna-017-medical-pbl-interaction-networks-performance-summary.png",
    text: {
      en: {
        title:
          "Online problem-based learning interaction networks and medical student performance",
        imageAlt:
          "Photograph of medical students discussing cases in several small tutorial groups, with subtle directional interaction lines",
        summary:
          "A study of 135 students and 15 tutors across 15 problem-based learning groups analyzed 2,620 online interactions, 89 percent of them student-to-student. Out-degree and tutor interaction had small positive correlations with performance, showing useful relational signals without supporting causal ranking.",
        actors: "135 medical students and 15 tutors assigned to 15 online PBL groups",
        relations:
          "directed learning-platform interactions among students and tutors, including posted replies within each problem discussion",
        analysis:
          "The authors constructed directed group networks, calculated centrality and cohesion measures, visualized participation patterns, and used Spearman correlations to compare interaction positions with academic performance.",
        finding:
          "Student-to-student exchanges formed 89 percent of 2,620 interactions; out-degree correlated with performance at about 0.27 and tutor interaction at about 0.22, both small observational associations.",
        value:
          "The results support examining who exchanges help with whom inside PBL groups rather than reducing collaboration to total logins, while keeping intervention decisions proportional to modest effects.",
        caveat:
          "This exploratory single-course case used platform activity as a proxy for educational exchange and did not model content quality, prior achievement, nested dependence, or unobserved offline interaction comprehensively. Its small correlations do not justify causal claims or automated high-stakes decisions.",
        tags: ["Medical education", "Online interaction", "Problem-based learning"],
      },
      "zh-hant": {
        title: "線上問題導向學習互動網絡與醫學生表現",
        imageAlt:
          "真人照片呈現醫學生在多個小型導修組討論病例，細緻有向互動線連接參與者",
        summary:
          "研究分析15個問題導向學習小組共135名學生、15名導師及2,620次線上互動，其中89%為學生對學生。出度及導師互動與表現呈小幅正相關，顯示有用關係訊號但不支持因果排名。",
        actors: "分配至15個線上問題導向學習小組的135名醫學生及15名導師",
        relations: "學生與導師在每個問題討論內透過學習平台作出的有向互動及回覆",
        analysis:
          "作者建立有向小組網絡，計算中心性與凝聚指標，呈現參與模式，並以Spearman相關比較互動位置與學業表現。",
        finding:
          "2,620次互動中有89%為學生對學生；出度與表現的相關約為0.27，導師互動約為0.22，兩者均屬小型觀察關聯。",
        value:
          "結果支持檢視問題導向學習小組內誰與誰交換協助，而不是把協作縮成登入總數，同時應按有限效應採取合比例支援。",
        caveat:
          "這項探索性單課程個案以平台活動代替教育交流，未全面建模內容品質、既往成績、巢狀依賴或未觀察線下互動。小幅相關不能支持因果主張或自動化高風險決策。",
        tags: ["醫學教育", "線上互動", "問題導向學習"],
      },
      "zh-hans": {
        title: "在线问题导向学习互动网络与医学生表现",
        imageAlt:
          "真人照片呈现医学生在多个小型辅导组讨论病例，细致有向互动线连接参与者",
        summary:
          "研究分析15个问题导向学习小组共135名学生、15名导师及2,620次在线互动，其中89%为学生对学生。出度及导师互动与表现呈小幅正相关，显示有用关系信号但不支持因果排名。",
        actors: "分配到15个在线问题导向学习小组的135名医学生及15名导师",
        relations: "学生与导师在每个问题讨论内通过学习平台作出的有向互动及回复",
        analysis:
          "作者建立有向小组网络，计算中心性与凝聚指标，呈现参与模式，并用Spearman相关比较互动位置与学业表现。",
        finding:
          "2,620次互动中有89%为学生对学生；出度与表现的相关约为0.27，导师互动约为0.22，两者均属小型观察关联。",
        value:
          "结果支持检视问题导向学习小组内谁与谁交换帮助，而不是把协作缩成登录总数，同时应按有限效应采取适度支持。",
        caveat:
          "这项探索性单课程个案以平台活动代替教育交流，未全面建模内容质量、既往成绩、嵌套依赖或未观察线下互动。小幅相关不能支持因果主张或自动化高风险决策。",
        tags: ["医学教育", "在线互动", "问题导向学习"],
      },
    },
  },
  {
    id: "sna-018",
    sequence: 18,
    slug: "rotating-trainee-doctor-learning-networks",
    type: "journal",
    authors: ["Fiona Sullivan", "Reema Saatchi", "Ibrahim Younis", "Matthew Harris"],
    venue: "BMJ Open",
    citation: "BMJ Open, 9(12), e027039",
    doi: "10.1136/bmjopen-2018-027039",
    sourceUrl: "https://bmjopen.bmj.com/content/9/12/e027039",
    sourceLabel: "BMJ Open",
    publishedAt: "2019-12-10",
    year: 2019,
    reviewedAt: "2026-07-28",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-018-rotating-trainee-doctor-learning-networks.png",
    summaryImage:
      "/images/news/summary/sna-018-rotating-trainee-doctor-learning-networks-summary.png",
    text: {
      en: {
        title:
          "How rotating trainee-doctor networks support different kinds of workplace learning",
        imageAlt:
          "Photograph of trainee doctors consulting across hospital team huddles, with colored advice paths spanning the corridor",
        summary:
          "Across five rotational hospital teams over 24 months, 39 trainee doctors completed network surveys and a separate set of 15 trainees were interviewed. Advice and emulation ties differed across clinical-technical, patient-centered, and work-organization learning, showing that one generic network misses domain-specific pathways.",
        actors:
          "trainee doctors working in five successive rotational teams in one acute hospital unit",
        relations:
          "directed nominations of colleagues used for advice or emulation in three distinct workplace-learning domains",
        analysis:
          "The team built separate sociocentric networks for clinical-technical practice, patient-centered care, and work organization, compared positions and patterns across rotations, and integrated those maps with thematic interviews.",
        finding:
          "Learning networks varied by domain: the people approached for technical advice were not automatically the same colleagues observed for patient-centered practice or work organization.",
        value:
          "The study argues for measuring the actual learning relation of interest and can help placement designers create access to several kinds of expertise rather than promote one supposedly universal mentor.",
        caveat:
          "The study followed a single acute unit with successive small cohorts; survey and interview samples were different, ties were self-reported, and rotation timing changed who could interact. The mixed-method case supports contextual explanation but not causal or hospital-wide generalization.",
        tags: ["Workplace learning", "Medical training", "Multiplex advice"],
      },
      "zh-hant": {
        title: "輪轉實習醫生網絡如何支援不同類型的職場學習",
        imageAlt:
          "真人照片呈現實習醫生在醫院多個團隊小組間請教，彩色建議路徑跨越走廊連接各組",
        summary:
          "研究在24個月內涵蓋五個輪轉醫院團隊，39名實習醫生完成網絡問卷，另一組15人接受訪談。臨床技術、病人為本及工作組織三類學習的建議與模仿連結不同，顯示單一通用網絡會遺漏領域特定路徑。",
        actors: "在一個急症醫院單位五個連續輪轉團隊工作的實習醫生",
        relations: "在三個不同職場學習領域中，指向提供建議或作為模仿對象之同事的有向提名",
        analysis:
          "研究分別建立臨床技術、病人為本照護及工作組織的社會中心網絡，比較各輪轉的位置與模式，再把網絡圖與主題訪談結合。",
        finding:
          "學習網絡因領域而異：被尋求技術建議的人，未必同時是病人為本實踐或工作組織方面的觀察對象。",
        value:
          "研究主張量度真正關心的學習關係，並可協助實習設計者提供多種專業知識渠道，而非推選一位假定通用的導師。",
        caveat:
          "研究只追蹤一個急症單位的連續小型群組；問卷與訪談樣本不同，連結來自自陳，而輪轉時間亦改變可互動對象。混合方法個案可支援情境解釋，但不能作因果或全院推廣。",
        tags: ["職場學習", "醫學培訓", "多重建議網絡"],
      },
      "zh-hans": {
        title: "轮转实习医生网络如何支持不同类型的职场学习",
        imageAlt:
          "真人照片呈现实习医生在医院多个团队小组间请教，彩色建议路径跨越走廊连接各组",
        summary:
          "研究在24个月内涵盖五个轮转医院团队，39名实习医生完成网络问卷，另一组15人接受访谈。临床技术、以患者为中心及工作组织三类学习的建议与模仿连接不同，显示单一通用网络会遗漏领域特定路径。",
        actors: "在一个急症医院单位五个连续轮转团队工作的实习医生",
        relations: "在三个不同职场学习领域中，指向提供建议或作为模仿对象之同事的有向提名",
        analysis:
          "研究分别建立临床技术、以患者为中心照护及工作组织的社会中心网络，比较各轮转的位置与模式，再把网络图与主题访谈结合。",
        finding:
          "学习网络因领域而异：被寻求技术建议的人，未必同时是以患者为中心实践或工作组织方面的观察对象。",
        value:
          "研究主张测量真正关心的学习关系，并可帮助实习设计者提供多种专业知识渠道，而不是推选一位假定通用的导师。",
        caveat:
          "研究只追踪一个急症单位的连续小型群组；问卷与访谈样本不同，连接来自自报，而轮转时间也改变可互动对象。混合方法个案可支持情境解释，但不能作因果或全院推广。",
        tags: ["职场学习", "医学培训", "多重建议网络"],
      },
    },
  },
  {
    id: "sna-019",
    sequence: 19,
    slug: "physics-engagement-centrality-performance",
    type: "journal",
    authors: ["Eric A. Williams", "Justyna P. Zwolak", "Remy Dou", "Eric Brewe"],
    venue: "Physical Review Physics Education Research",
    citation: "Physical Review Physics Education Research, 15(2), 020150",
    doi: "10.1103/PhysRevPhysEducRes.15.020150",
    sourceUrl:
      "https://journals.aps.org/prper/abstract/10.1103/PhysRevPhysEducRes.15.020150",
    sourceLabel: "Physical Review Physics Education Research",
    publishedAt: "2019-12-12",
    year: 2019,
    reviewedAt: "2026-07-29",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-019-physics-engagement-centrality-performance.png",
    summaryImage:
      "/images/news/summary/sna-019-physics-engagement-centrality-performance-summary.png",
    text: {
      en: {
        title:
          "Linking engagement and performance through longitudinal physics classroom networks",
        imageAlt:
          "Photograph of university students collaborating at physics lab tables, with network lines and checkpoint lights across the classroom",
        summary:
          "Longitudinal interaction surveys in a two-semester Modeling Instruction physics sequence tracked classroom networks at four exam points per term. Three of four centrality measures predicted later performance after prior GPA controls, and closeness added up to 28 percent explained variance as the community developed.",
        actors:
          "students enrolled in an active-learning introductory physics sequence using Modeling Instruction",
        relations:
          "reported in-class learning interactions among students, observed repeatedly near four examinations in each semester",
        analysis:
          "The authors constructed repeated classroom networks, calculated degree, eigenvector, closeness and betweenness centrality, and used bootstrapped regression models controlling for pre-course GPA to predict subsequent exam and final performance.",
        finding:
          "Three centrality measures predicted future performance in at least part of the sequence; closeness provided the largest incremental contribution, and network effects became clearer in the second half as peer structures stabilized.",
        value:
          "The longitudinal design improves temporal ordering and shows that the usefulness of a network measure can depend on when a learning community has had time to form.",
        caveat:
          "The analysis concerns one active-learning physics context and observational peer interaction. Prior GPA adjustment cannot remove all selection, centrality measures are interdependent and time-sensitive, and prediction does not prove that moving a student toward the network center would cause higher achievement.",
        tags: ["Physics education", "Longitudinal networks", "Centrality"],
      },
      "zh-hant": {
        title: "以縱向物理課堂網絡連結參與及表現",
        imageAlt:
          "真人照片呈現大學生在物理實驗桌協作，網絡線與檢查點光標分布於課室之中",
        summary:
          "一個為期兩學期的建模教學物理序列，在每學期四個考試時點以互動問卷追蹤課堂網絡。控制既往GPA後，四項中心性中有三項預測其後表現；隨社群發展，接近中心性最多增加28%解釋變異。",
        actors: "修讀採用建模教學之主動學習基礎物理序列的學生",
        relations: "學生報告的課堂學習互動，於每學期接近四次考試時重複觀察",
        analysis:
          "作者建立重複課堂網絡，計算度數、特徵向量、接近及中介中心性，並以控制課前GPA的自助法迴歸模型預測其後考試與期末表現。",
        finding:
          "三項中心性在序列至少部分時段預測未來表現；接近中心性的額外貢獻最大，而當同儕結構穩定後，網絡效應在後半段較清楚。",
        value:
          "縱向設計改善時間次序判斷，並顯示一項網絡指標是否有用，可能取決於學習社群是否已有足夠時間形成。",
        caveat:
          "分析只涉及一個主動學習物理情境及觀察所得同儕互動。控制既往GPA不能消除所有選擇，中心性彼此依賴且隨時間改變；預測不能證明把學生移向網絡中心會造成較高成績。",
        tags: ["物理教育", "縱向網絡", "中心性"],
      },
      "zh-hans": {
        title: "以纵向物理课堂网络连接参与及表现",
        imageAlt:
          "真人照片呈现大学生在物理实验桌协作，网络线与检查点光标分布于教室之中",
        summary:
          "一个为期两学期的建模教学物理序列，在每学期四个考试时点用互动问卷追踪课堂网络。控制既往GPA后，四项中心性中有三项预测其后表现；随社群发展，接近中心性最多增加28%解释变异。",
        actors: "修读采用建模教学之主动学习基础物理序列的学生",
        relations: "学生报告的课堂学习互动，在每学期接近四次考试时重复观察",
        analysis:
          "作者建立重复课堂网络，计算度数、特征向量、接近及中介中心性，并用控制课前GPA的自助法回归模型预测其后考试与期末表现。",
        finding:
          "三项中心性在序列至少部分时段预测未来表现；接近中心性的额外贡献最大，而当同伴结构稳定后，网络效应在后半段更清楚。",
        value:
          "纵向设计改善时间次序判断，并显示一项网络指标是否有用，可能取决于学习社群是否已有足够时间形成。",
        caveat:
          "分析只涉及一个主动学习物理情境及观察到的同伴互动。控制既往GPA不能消除所有选择，中心性彼此依赖且随时间改变；预测不能证明把学生移向网络中心会造成更高成绩。",
        tags: ["物理教育", "纵向网络", "中心性"],
      },
    },
  },
  {
    id: "sna-020",
    sequence: 20,
    slug: "medical-clerkship-support-ego-networks",
    type: "journal",
    authors: [
      "Anique Atherley",
      "Laura Nimmon",
      "Pim Teunissen",
      "Diana Dolmans",
      "Iman Hegazi",
      "Wendy Hu",
    ],
    venue: "Medical Education",
    citation: "Medical Education, 55(3), 376-386",
    doi: "10.1111/medu.14382",
    sourceUrl:
      "https://asmepublications.onlinelibrary.wiley.com/doi/full/10.1111/medu.14382",
    sourceLabel: "Medical Education",
    publishedAt: "2020-09-21",
    year: 2020,
    reviewedAt: "2026-07-30",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-020-medical-clerkship-support-ego-networks.png",
    summaryImage:
      "/images/news/summary/sna-020-medical-clerkship-support-ego-networks-summary.png",
    text: {
      en: {
        title:
          "How medical students reshape support networks during the transition to clerkships",
        imageAlt:
          "Photograph of a medical student receiving supervisor guidance, with peers, family, and friends connected through subtle ego-network rings",
        summary:
          "Eight medical students drew ego-network maps within two weeks of starting clerkships and again four months later, then explained the changes in interviews. Their combined alters shifted from 128 to 134 as students deliberately created, retained, and dissolved ties for emotional and instrumental support.",
        actors:
          "eight focal medical students and the family members, peers, clinicians, supervisors, and others each named as support contacts",
        relations:
          "ego-reported support relationships, categorized by role and by emotional or instrumental purpose at two transition points",
        analysis:
          "Researchers compared paired personal network maps and alter composition across the two waves, then used longitudinal qualitative interviews to explain why relationships were created, maintained, strengthened, weakened, or dissolved.",
        finding:
          "The overall alter count changed only slightly, but network membership and function changed substantially; students actively assembled different combinations of emotional reassurance and practical clinical help.",
        value:
          "The study shifts attention from having more contacts to having access to the right kinds of support during a demanding transition, and demonstrates the explanatory value of pairing ego maps with interviews.",
        caveat:
          "Only eight volunteers from one institution participated, ties and functions were self-described, and drawing the first map may itself have prompted network reflection. The qualitative ego-network design offers mechanism-rich accounts but no population estimate or causal test.",
        tags: ["Ego networks", "Clerkship transition", "Student support"],
      },
      "zh-hant": {
        title: "醫學生在進入臨床實習時如何重塑支援網絡",
        imageAlt:
          "真人照片呈現醫學生接受督導指導，細緻自我中心網絡圈連接同儕、家人與朋友",
        summary:
          "八名醫學生在開始臨床實習兩週內及四個月後各繪一次自我中心網絡圖，並以訪談解釋變化。合計他者由128名變成134名，學生會刻意建立、保留及終止關係，以取得情緒及工具性支援。",
        actors: "八名焦點醫學生，以及每人提名為支援聯絡的家人、同儕、臨床人員、督導及其他人士",
        relations: "在兩個轉變時點由焦點學生報告，並按角色及情緒或工具性用途分類的支援關係",
        analysis:
          "研究比較兩波配對個人網絡圖及他者組成，再用縱向質性訪談解釋關係為何被建立、維持、加強、減弱或終止。",
        finding:
          "他者總數只略為改變，但網絡成員與功能顯著轉換；學生主動組合不同的情緒安定與臨床實務協助。",
        value:
          "研究把焦點由更多聯絡人轉向在艱難過渡期能否取得合適支援，並示範自我中心網絡圖配合訪談的解釋價值。",
        caveat:
          "只有單一院校八名志願者參與，連結與功能均由自己描述，第一次繪圖亦可能促使學生反思網絡。質性自我中心網絡設計提供豐富機制描述，但不能作人口估計或因果檢驗。",
        tags: ["自我中心網絡", "臨床實習過渡", "學生支援"],
      },
      "zh-hans": {
        title: "医学生在进入临床实习时如何重塑支持网络",
        imageAlt:
          "真人照片呈现医学生接受督导指导，细致自我中心网络圈连接同伴、家人与朋友",
        summary:
          "八名医学生在开始临床实习两周内及四个月后各绘一次自我中心网络图，并用访谈解释变化。合计他者由128名变成134名，学生会有意建立、保留及终止关系，以获得情绪及工具性支持。",
        actors: "八名焦点医学生，以及每人提名为支持联系的家人、同伴、临床人员、督导及其他人士",
        relations: "在两个转变时点由焦点学生报告，并按角色及情绪或工具性用途分类的支持关系",
        analysis:
          "研究比较两波配对个人网络图及他者组成，再用纵向质性访谈解释关系为何被建立、维持、加强、减弱或终止。",
        finding:
          "他者总数只略微改变，但网络成员与功能显著转换；学生主动组合不同的情绪安定与临床实务帮助。",
        value:
          "研究把焦点从更多联系人转向在艰难过渡期能否获得合适支持，并示范自我中心网络图配合访谈的解释价值。",
        caveat:
          "只有单一院校八名志愿者参与，连接与功能均由自己描述，第一次绘图也可能促使学生反思网络。质性自我中心网络设计提供丰富机制描述，但不能作人口估计或因果检验。",
        tags: ["自我中心网络", "临床实习过渡", "学生支持"],
      },
    },
  },
  {
    id: "sna-021",
    sequence: 21,
    slug: "values-affirmation-classroom-friendship-networks",
    type: "journal",
    authors: [
      "Kate M. Turetsky",
      "Valerie Purdie-Greenaway",
      "Jonathan E. Cook",
      "Joseph P. Curley",
      "Geoffrey L. Cohen",
    ],
    venue: "Science Advances",
    citation: "Science Advances, 6(45), eaba9221",
    doi: "10.1126/sciadv.aba9221",
    sourceUrl: "https://www.science.org/doi/10.1126/sciadv.aba9221",
    sourceLabel: "Science Advances",
    publishedAt: "2020-11-06",
    year: 2020,
    reviewedAt: "2026-07-31",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-021-values-affirmation-classroom-friendship-networks.png",
    summaryImage:
      "/images/news/summary/sna-021-values-affirmation-classroom-friendship-networks-summary.png",
    text: {
      en: {
        title:
          "A values-affirmation intervention changed biology classroom friendship networks",
        imageAlt:
          "Photograph of biology students writing reflection cards at classroom tables, with new friendship ties crossing groups and a doorway behind them",
        summary:
          "In a gateway biology course, students were randomized to a 15-minute values-affirmation or control writing task in week three. Among 226 students with baseline and end data, treated students reported about 29.2 percent more friends and were 11.7 percentage points more likely to enroll in the next course.",
        actors:
          "students in a gateway college biology class, embedded within the complete roster network",
        relations:
          "directed, weighted friendship nominations measured at baseline and again near the end of the course",
        analysis:
          "The researchers compared randomized groups on network size, degree and closeness, modeled continuation into the next biology course, and used Bayesian mediation analyses to examine whether friendship-network changes could carry the treatment association.",
        finding:
          "Affirmed students reported larger friendship networks, higher degree and closeness, and greater subsequent course enrollment; mediation estimates were consistent with friendship growth as one pathway, especially for outgoing nominations.",
        value:
          "The experiment provides unusually strong evidence that a brief psychological intervention can alter relational integration, connecting individual experience with classroom network structure and later academic participation.",
        caveat:
          "Of 552 invited students, 328 consented, 290 received an intervention, and 226 completed both network waves, so attrition and missing nominations matter. The work concerns one course, outgoing and incoming ties differed, and statistical mediation does not by itself prove the social mechanism.",
        tags: ["Randomized intervention", "Friendship networks", "STEM persistence"],
      },
      "zh-hant": {
        title: "價值肯定介入改變生物課堂友誼網絡",
        imageAlt:
          "真人照片呈現生物課學生在課桌書寫反思卡，新友誼連結跨越小組，後方可見課室門口",
        summary:
          "一門生物入門課在第三週把學生隨機分配至15分鐘價值肯定或對照書寫。226名同時有基線及期末資料的學生中，介入組報告的朋友約多29.2%，修讀下一門課的機率亦高11.7個百分點。",
        actors: "生物入門大學課堂的學生，並置於完整班級名冊網絡內",
        relations: "在基線及接近期末兩次量度的有向加權友誼提名",
        analysis:
          "研究比較隨機組別的網絡規模、度數及接近中心性，建模下一門生物課修讀情況，並以貝葉斯中介分析檢驗友誼網絡變化能否傳遞介入關聯。",
        finding:
          "肯定組學生報告較大友誼網絡、較高度數與接近中心性，以及較高後續選課率；中介估計與友誼增長作為其中一路徑一致，外向提名尤其明顯。",
        value:
          "這項實驗提供較強證據，顯示短暫心理介入可以改變關係融入，並把個人經驗連接至課堂網絡結構及其後學業參與。",
        caveat:
          "552名受邀學生中328人同意、290人接受介入、226人完成兩波網絡，因此流失及缺失提名十分重要。研究只涉及一門課，外向與入向連結結果不同，而統計中介本身不能證明社會機制。",
        tags: ["隨機介入", "友誼網絡", "STEM持續修讀"],
      },
      "zh-hans": {
        title: "价值肯定干预改变生物课堂友谊网络",
        imageAlt:
          "真人照片呈现生物课学生在课桌书写反思卡，新友谊连接跨越小组，后方可见教室门口",
        summary:
          "一门生物入门课在第三周把学生随机分配到15分钟价值肯定或对照书写。226名同时有基线及期末数据的学生中，干预组报告的朋友约多29.2%，修读下一门课的概率也高11.7个百分点。",
        actors: "生物入门大学课堂的学生，并置于完整班级名册网络内",
        relations: "在基线及接近期末两次测量的有向加权友谊提名",
        analysis:
          "研究比较随机组别的网络规模、度数及接近中心性，建模下一门生物课修读情况，并用贝叶斯中介分析检验友谊网络变化能否传递干预关联。",
        finding:
          "肯定组学生报告更大友谊网络、更高度数与接近中心性，以及更高后续选课率；中介估计与友谊增长作为其中一路径一致，外向提名尤其明显。",
        value:
          "这项实验提供较强证据，显示短暂心理干预可以改变关系融入，并把个人经验连接到课堂网络结构及其后学业参与。",
        caveat:
          "552名受邀学生中328人同意、290人接受干预、226人完成两波网络，因此流失及缺失提名十分重要。研究只涉及一门课，外向与入向连接结果不同，而统计中介本身不能证明社会机制。",
        tags: ["随机干预", "友谊网络", "STEM持续修读"],
      },
    },
  },
  {
    id: "sna-022",
    sequence: 22,
    slug: "medical-student-coregulation-networks",
    type: "journal",
    authors: [
      "Derk Bransen",
      "Erik Driessen",
      "Dominique Sluijsmans",
      "Marjan Govaerts",
    ],
    venue: "BMC Medical Education",
    citation: "BMC Medical Education, 22, Article 193",
    doi: "10.1186/s12909-022-03259-0",
    sourceUrl:
      "https://link.springer.com/article/10.1186/s12909-022-03259-0",
    sourceLabel: "BMC Medical Education",
    publishedAt: "2022-03-21",
    year: 2022,
    reviewedAt: "2026-08-01",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-022-medical-student-coregulation-networks.png",
    summaryImage:
      "/images/news/summary/sna-022-medical-student-coregulation-networks-summary.png",
    text: {
      en: {
        title:
          "How medical students compose personal co-regulation networks across clerkships",
        imageAlt:
          "Three-part photograph of one medical student moving from peer study to clinical teamwork and focused supervisor feedback",
        summary:
          "A questionnaire completed by 403 medical students, a 65.5 percent response rate, mapped the people they approached for co-regulated learning and the purposes those contacts served. Later-year students reported proportionally more supervisors and fewer peers in their personal learning networks.",
        actors:
          "medical students as focal actors and the peers, supervisors, clinicians, family members, and others they named for learning regulation",
        relations:
          "ego-reported contacts used for co-regulation purposes such as feedback, reflection, goal setting, and emotional or practical support",
        analysis:
          "The authors described alter roles and functions within personal networks, calculated proportions by contact category, and used analysis of variance to compare network composition across clerkship years.",
        finding:
          "As students progressed, supervisors occupied a larger share and peers a smaller share of reported co-regulation networks, suggesting that access to support is reorganized across the clinical curriculum.",
        value:
          "The study gives educators a relational lens on self-regulated learning and highlights that students regulate learning with a changing constellation of people rather than entirely by themselves.",
        caveat:
          "The 403 responses were cross-sectional rather than repeated observations of the same students, all ties were self-reported, nonresponse may change network composition, and proportional differences do not show that clerkship progression caused the shift or that one composition is better.",
        tags: ["Co-regulated learning", "Personal networks", "Clerkships"],
      },
      "zh-hant": {
        title: "醫學生在臨床實習各階段如何組成個人共同調節網絡",
        imageAlt:
          "三段真人照片呈現同一名醫學生由同儕溫習轉到臨床團隊合作，再接受督導個別回饋",
        summary:
          "403名醫學生完成問卷，回應率65.5%，研究繪出他們為共同調節學習而接觸的人及各聯絡用途。較高年級學生的個人學習網絡中，督導比例較高而同儕比例較低。",
        actors: "作為焦點行動者的醫學生，以及他們為學習調節提名的同儕、督導、臨床人員、家人及其他人士",
        relations: "用於回饋、反思、目標設定、情緒或實務支援等共同調節用途的自陳聯絡",
        analysis:
          "作者描述個人網絡內他者角色及功能，計算各聯絡類別比例，並以變異數分析比較不同臨床實習年級的網絡組成。",
        finding:
          "隨學習進程推進，督導在自陳共同調節網絡的比例增加，同儕比例下降，顯示臨床課程中支援渠道會重新組織。",
        value:
          "研究以關係視角理解自我調節學習，強調學生並非完全獨自調節，而是與不斷改變的一組人物共同完成。",
        caveat:
          "403份回應屬橫斷面資料，並非重複觀察同一批學生；所有連結均為自陳，未回應可能改變網絡組成。比例差異不能證明臨床實習進程造成轉變，也不能證明某一組成較佳。",
        tags: ["共同調節學習", "個人網絡", "臨床實習"],
      },
      "zh-hans": {
        title: "医学生在临床实习各阶段如何组成个人共同调节网络",
        imageAlt:
          "三段真人照片呈现同一名医学生由同伴复习转到临床团队合作，再接受督导个别反馈",
        summary:
          "403名医学生完成问卷，回应率65.5%，研究绘出他们为共同调节学习而接触的人及各联系用途。较高年级学生的个人学习网络中，督导比例更高而同伴比例更低。",
        actors: "作为焦点行动者的医学生，以及他们为学习调节提名的同伴、督导、临床人员、家人及其他人士",
        relations: "用于反馈、反思、目标设定、情绪或实务支持等共同调节用途的自报联系",
        analysis:
          "作者描述个人网络内他者角色及功能，计算各联系类别比例，并用方差分析比较不同临床实习年级的网络组成。",
        finding:
          "随学习进程推进，督导在自报共同调节网络的比例增加，同伴比例下降，显示临床课程中支持渠道会重新组织。",
        value:
          "研究用关系视角理解自我调节学习，强调学生并非完全独自调节，而是与不断改变的一组人物共同完成。",
        caveat:
          "403份回应属于横断面数据，并非重复观察同一批学生；所有连接均为自报，未回应可能改变网络组成。比例差异不能证明临床实习进程造成转变，也不能证明某一组成更好。",
        tags: ["共同调节学习", "个人网络", "临床实习"],
      },
    },
  },
  {
    id: "sna-023",
    sequence: 23,
    slug: "physics-collaboration-network-evolution",
    type: "journal",
    authors: ["Steven Wolf", "Timothy Sault", "Tyme Suda", "Adrienne Traxler"],
    venue: "Applied Network Science",
    citation: "Applied Network Science, 7, Article 24",
    doi: "10.1007/s41109-022-00465-z",
    sourceUrl:
      "https://link.springer.com/article/10.1007/s41109-022-00465-z",
    sourceLabel: "Applied Network Science",
    publishedAt: "2022-05-04",
    year: 2022,
    reviewedAt: "2026-08-02",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-023-physics-collaboration-network-evolution.png",
    summaryImage:
      "/images/news/summary/sna-023-physics-collaboration-network-evolution-summary.png",
    text: {
      en: {
        title:
          "Tracking collaboration structure across a two-course introductory physics sequence",
        imageAlt:
          "Photograph of students collaborating in a physics laboratory, with eight sequential network snapshots above the class",
        summary:
          "Students in a two-course introductory physics sequence named collaborators at four exams per semester. Global and node measures, structural-equivalence blocks, and communities showed an early period of relationship exploration, later stabilization, and substantial carryover of ties into the second term.",
        actors:
          "students enrolled across the fall and spring courses of one introductory physics sequence",
        relations:
          "directed self-reports of classmates with whom each student had meaningfully collaborated during the current exam interval",
        analysis:
          "The team compared repeated global and node metrics, used CONCOR to identify structurally equivalent blocks, applied edge-betweenness community detection, and tracked persistence and change across eight survey waves.",
        finding:
          "Fall networks first showed a period of trying out partners and then stabilized; about half the class carried relationships into spring, while the first-to-second exam transition disrupted conventional metrics even when structural blocks remained recognizable.",
        value:
          "The paper shows why longitudinal classroom analysis should track both specific ties and role-equivalent structures, because one can change while the other remains stable.",
        caveat:
          "Evidence came from one physics sequence and self-reported collaboration windows. Exam timing, enrollment changes, missing nominations, and the selected block and community algorithms influence the pattern, so the study describes evolution without identifying an instructional cause.",
        tags: ["Temporal networks", "Physics collaboration", "Blockmodels"],
      },
      "zh-hant": {
        title: "追蹤兩門基礎物理課程序列的協作結構",
        imageAlt:
          "真人照片呈現學生在物理實驗室協作，課室上方排列八個連續網絡快照",
        summary:
          "一個兩門基礎物理課程序列的學生，在每學期四次考試時提名協作者。整體與節點指標、結構等價區塊及社群顯示，早期會探索關係，其後逐步穩定，並有相當部分連結延續至第二學期。",
        actors: "修讀同一基礎物理序列秋季及春季課程的學生",
        relations: "每名學生自陳在當次考試時段曾有實質協作之同學的有向提名",
        analysis:
          "研究比較重複量度的整體及節點指標，以CONCOR識別結構等價區塊，採用邊中介社群偵測，並追蹤八波問卷之間的持續與改變。",
        finding:
          "秋季網絡先出現嘗試合作伙伴的階段，之後趨於穩定；約半數學生把關係帶到春季，而首次至第二次考試的轉變會擾動傳統指標，即使結構區塊仍可辨認。",
        value:
          "論文說明縱向課堂分析為何應同時追蹤具體連結及角色等價結構，因為其中一項可以改變而另一項保持穩定。",
        caveat:
          "證據來自一個物理課程序列及自陳協作時段。考試時間、修讀人數變化、缺失提名及所選區塊與社群演算法均會影響模式，因此研究描述演化但未識別教學原因。",
        tags: ["時間網絡", "物理協作", "區塊模型"],
      },
      "zh-hans": {
        title: "追踪两门基础物理课程序列的协作结构",
        imageAlt:
          "真人照片呈现学生在物理实验室协作，教室上方排列八个连续网络快照",
        summary:
          "一个两门基础物理课程序列的学生，在每学期四次考试时提名协作者。整体与节点指标、结构等价区块及社群显示，早期会探索关系，其后逐步稳定，并有相当部分连接延续到第二学期。",
        actors: "修读同一基础物理序列秋季及春季课程的学生",
        relations: "每名学生自报在当次考试时段曾有实质协作之同学的有向提名",
        analysis:
          "研究比较重复测量的整体及节点指标，用CONCOR识别结构等价区块，采用边中介社群检测，并追踪八波问卷之间的持续与改变。",
        finding:
          "秋季网络先出现尝试合作伙伴的阶段，之后趋于稳定；约半数学生把关系带到春季，而首次至第二次考试的转变会扰动传统指标，即使结构区块仍可辨认。",
        value:
          "论文说明纵向课堂分析为何应同时追踪具体连接及角色等价结构，因为其中一项可以改变而另一项保持稳定。",
        caveat:
          "证据来自一个物理课程序列及自报协作时段。考试时间、修读人数变化、缺失提名及所选区块与社群算法均会影响模式，因此研究描述演化但未识别教学原因。",
        tags: ["时间网络", "物理协作", "区块模型"],
      },
    },
  },
  {
    id: "sna-024",
    sequence: 24,
    slug: "participatory-interest-groups-residency-networks",
    type: "journal",
    authors: [
      "Mona Aghaei",
      "Mahnaz Sharifi",
      "Zahra Tabatabaee",
      "Fatemeh Abdi-Masouleh",
      "Reza Yousefi Nooraie",
    ],
    venue: "BMC Medical Education",
    citation: "BMC Medical Education, 22, Article 367",
    doi: "10.1186/s12909-022-03440-5",
    sourceUrl:
      "https://link.springer.com/article/10.1186/s12909-022-03440-5",
    sourceLabel: "BMC Medical Education",
    publishedAt: "2022-05-13",
    year: 2022,
    reviewedAt: "2026-08-03",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-024-participatory-interest-groups-residency-networks.png",
    summaryImage:
      "/images/news/summary/sna-024-participatory-interest-groups-residency-networks-summary.png",
    text: {
      en: {
        title:
          "Participatory interest groups and the development of residency support networks",
        imageAlt:
          "Photograph of resident physicians in several hospital lounge huddles, with colored relationship paths and seven observation markers",
        summary:
          "Seventeen second-year residents were invited into four participatory interest groups with faculty during a seven-month program. Resident and resident-faculty networks for clinical advice, educational advice, and personal support were measured before and after; active participants showed selected wellbeing and tie gains.",
        actors:
          "second-year medical residents and faculty members involved in the residency program",
        relations:
          "directed nominations for clinical advice, educational advice, and personal support in resident-only and resident-faculty networks",
        analysis:
          "The study compared density, reciprocity, in-degree centralization and individual outcomes before and after the interest groups, used 5,000 bootstrap samples for network change, and fitted mixed models for repeated wellbeing measures.",
        finding:
          "Seven residents and six faculty were active in the groups; active residents improved on personal accomplishment and learning-environment measures, and active faculty developed more ties, while several network changes were uneven.",
        value:
          "The design connects participatory organizational work with distinct support relations and illustrates how network measures can reveal whether a program broadens access to advice rather than only whether attendees liked it.",
        caveat:
          "The program involved 17 residents without a control group, participation was self-selected, only a subset remained active, and faculty and resident exposure varied. Small samples and concurrent changes prevent causal attribution, while nomination counts do not measure advice quality.",
        tags: ["Residency education", "Participatory groups", "Support networks"],
      },
      "zh-hant": {
        title: "參與式興趣小組與住院醫生支援網絡的發展",
        imageAlt:
          "真人照片呈現住院醫生在醫院休息室分組交流，彩色關係路徑配以七個觀察標記",
        summary:
          "17名二年級住院醫生在七個月計劃中獲邀與教師組成四個參與式興趣小組。研究在前後量度住院醫生及醫生與教師之間的臨床建議、教育建議及個人支援網絡；活躍參與者在部分福祉及連結指標上改善。",
        actors: "參與住院醫生培訓計劃的二年級住院醫生及教師",
        relations: "住院醫生內部及住院醫生與教師網絡中的臨床建議、教育建議與個人支援有向提名",
        analysis:
          "研究比較興趣小組前後的密度、互惠、入度集中化及個人結果，以5,000次自助抽樣檢驗網絡變化，並為重複福祉量度配適混合模型。",
        finding:
          "七名住院醫生及六名教師活躍參與；活躍住院醫生的個人成就感與學習環境指標改善，活躍教師建立更多連結，但多項網絡改變並不一致。",
        value:
          "設計把參與式組織工作與不同支援關係連接，並示範網絡指標如何揭示計劃是否擴闊建議渠道，而不只詢問參加者是否滿意。",
        caveat:
          "計劃只有17名住院醫生而沒有對照組，參與屬自選，只有部分人保持活躍，教師與住院醫生的接觸程度亦不同。小樣本及同期變化妨礙因果歸因，而提名數目也不能量度建議品質。",
        tags: ["住院醫生教育", "參與式小組", "支援網絡"],
      },
      "zh-hans": {
        title: "参与式兴趣小组与住院医生支持网络的发展",
        imageAlt:
          "真人照片呈现住院医生在医院休息室分组交流，彩色关系路径配以七个观察标记",
        summary:
          "17名二年级住院医生在七个月项目中获邀与教师组成四个参与式兴趣小组。研究在前后测量住院医生及医生与教师之间的临床建议、教育建议及个人支持网络；活跃参与者在部分福祉及连接指标上改善。",
        actors: "参与住院医生培训项目的二年级住院医生及教师",
        relations: "住院医生内部及住院医生与教师网络中的临床建议、教育建议与个人支持有向提名",
        analysis:
          "研究比较兴趣小组前后的密度、互惠、入度集中化及个人结果，用5,000次自助抽样检验网络变化，并为重复福祉测量拟合混合模型。",
        finding:
          "七名住院医生及六名教师活跃参与；活跃住院医生的个人成就感与学习环境指标改善，活跃教师建立更多连接，但多项网络改变并不一致。",
        value:
          "设计把参与式组织工作与不同支持关系连接，并示范网络指标如何揭示项目是否拓宽建议渠道，而不只询问参加者是否满意。",
        caveat:
          "项目只有17名住院医生而没有对照组，参与属于自选，只有部分人保持活跃，教师与住院医生的接触程度也不同。小样本及同期变化妨碍因果归因，而提名数目也不能测量建议质量。",
        tags: ["住院医生教育", "参与式小组", "支持网络"],
      },
    },
  },
  {
    id: "sna-025",
    sequence: 25,
    slug: "edutube-channel-recommendation-networks",
    type: "journal",
    authors: [
      "Cynthia Pasquel-López",
      "Lucía Rodríguez-Aceves",
      "Gabriel Valerio-Ureña",
    ],
    venue: "Frontiers in Education",
    citation: "Frontiers in Education, 7, Article 845647",
    doi: "10.3389/feduc.2022.845647",
    sourceUrl:
      "https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2022.845647/full",
    sourceLabel: "Frontiers in Education",
    publishedAt: "2022-05-19",
    year: 2022,
    reviewedAt: "2026-08-04",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-025-edutube-channel-recommendation-networks.png",
    summaryImage:
      "/images/news/summary/sna-025-edutube-channel-recommendation-networks-summary.png",
    text: {
      en: {
        title:
          "Recommendation networks among educational video channels on YouTube",
        imageAlt:
          "Photograph of educators and researchers in a media lab studying a large recommendation network of anonymous video thumbnails",
        summary:
          "Researchers snowballed from 37 educational YouTube channels to a directed recommendation network of 412 channels and 1,303 links collected in October 2021. Degree, reciprocity, QAP, and MRQAP analyses linked outgoing recommendations with digital engagement and found homophily in reciprocal channel ties.",
        actors:
          "412 YouTube channels classified within the educational-video or EduTube ecosystem",
        relations:
          "directed channel-to-channel recommendations visible on platform pages during the October 2021 collection",
        analysis:
          "The study used snowball discovery from 37 entry channels, described degree and reciprocity, coded channel attributes, and applied QAP correlations and MRQAP models to account for relational dependence.",
        finding:
          "Channels with more outgoing recommendations tended to show greater measured digital engagement, and similar channels were more likely to reciprocate, although recommendation direction and platform mechanisms complicate interpretation.",
        value:
          "The article extends educational SNA beyond classrooms and helps researchers examine how platform recommendations organize discoverability and potential collaboration among learning-content producers.",
        caveat:
          "The network depends on 37 seeds, one collection month, platform recommendations, channel classification, and third-party engagement measures. Algorithmic personalization and deleted or hidden links are not fully observed, so results are cross-sectional associations rather than creator influence or causal platform effects.",
        tags: ["EduTube", "Recommendation networks", "Platform research"],
      },
      "zh-hant": {
        title: "YouTube教育影片頻道之間的推薦網絡",
        imageAlt:
          "真人照片呈現教育工作者與研究人員在媒體實驗室分析由匿名影片縮圖組成的大型推薦網絡",
        summary:
          "研究由37個教育YouTube頻道作雪球式擴展，建立2021年10月收集、含412個頻道及1,303條連結的有向推薦網絡。度數、互惠、QAP及MRQAP分析把外向推薦與數碼參與連結，並發現互惠頻道連結存在同質性。",
        actors: "被歸入教育影片或EduTube生態的412個YouTube頻道",
        relations: "在2021年10月收集時，平台頁面可見的頻道對頻道有向推薦",
        analysis:
          "研究由37個入口頻道作雪球式探索，描述度數與互惠，編碼頻道屬性，並利用QAP相關及MRQAP模型處理關係依賴。",
        finding:
          "外向推薦較多的頻道傾向有較高的數碼參與量度，而相似頻道較可能互相推薦；不過推薦方向及平台機制令解釋更複雜。",
        value:
          "論文把教育SNA由課堂延伸至平台，協助研究者檢視推薦如何組織學習內容創作者的可發現性及潛在協作。",
        caveat:
          "網絡取決於37個種子、一個收集月份、平台推薦、頻道分類及第三方參與量度。演算法個人化及已刪除或隱藏連結未被完整觀察，因此結果屬橫斷面關聯，而非創作者影響力或平台因果效果。",
        tags: ["教育影片平台", "推薦網絡", "平台研究"],
      },
      "zh-hans": {
        title: "YouTube教育视频频道之间的推荐网络",
        imageAlt:
          "真人照片呈现教育工作者与研究人员在媒体实验室分析由匿名视频缩略图组成的大型推荐网络",
        summary:
          "研究由37个教育YouTube频道作滚雪球式扩展，建立2021年10月收集、含412个频道及1,303条连接的有向推荐网络。度数、互惠、QAP及MRQAP分析把外向推荐与数字参与连接，并发现互惠频道连接存在同质性。",
        actors: "被归入教育视频或EduTube生态的412个YouTube频道",
        relations: "在2021年10月收集时，平台页面可见的频道对频道有向推荐",
        analysis:
          "研究由37个入口频道作滚雪球式探索，描述度数与互惠，编码频道属性，并利用QAP相关及MRQAP模型处理关系依赖。",
        finding:
          "外向推荐更多的频道倾向有更高的数字参与测量，而相似频道更可能互相推荐；不过推荐方向及平台机制使解释更复杂。",
        value:
          "论文把教育SNA从课堂延伸到平台，帮助研究者检视推荐如何组织学习内容创作者的可发现性及潜在协作。",
        caveat:
          "网络取决于37个种子、一个收集月份、平台推荐、频道分类及第三方参与测量。算法个性化及已删除或隐藏连接未被完整观察，因此结果属于横断面关联，而非创作者影响力或平台因果效果。",
        tags: ["教育视频平台", "推荐网络", "平台研究"],
      },
    },
  },
  {
    id: "sna-026",
    sequence: 26,
    slug: "first-year-medical-student-support-sociograms",
    type: "journal",
    authors: ["Samantha Stasiuk", "Maria Hubinette", "Laura Nimmon"],
    venue: "Canadian Medical Education Journal",
    citation: "Canadian Medical Education Journal, 13(5), 44-53",
    doi: "10.36834/cmej.73422",
    sourceUrl:
      "https://journalhosting.ucalgary.ca/index.php/cmej/article/view/73422",
    sourceLabel: "Canadian Medical Education Journal",
    publishedAt: "2022-05-27",
    year: 2022,
    reviewedAt: "2026-08-05",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-026-first-year-medical-student-support-sociograms.png",
    summaryImage:
      "/images/news/summary/sna-026-first-year-medical-student-support-sociograms-summary.png",
    text: {
      en: {
        title:
          "First-year medical students mapped in-groups, exclusion, and curricular support",
        imageAlt:
          "Photograph of medical students arranging seven hand-drawn sociogram cards during a reflective workshop",
        summary:
          "Seven first-year medical students created personal sociograms containing 61 alters and discussed them in semi-structured interviews. The qualitative network analysis identified in-grouping and exclusivity, while curriculum reflection sessions sometimes introduced perspectives beyond students' usual circles.",
        actors:
          "seven focal first-year medical students and the 61 people they placed in their personal social and support maps",
        relations:
          "participant-defined interpersonal connections representing meaningful peer, family, faculty, or other support relationships",
        analysis:
          "Researchers used participant-drawn sociograms to elicit network structure and then thematically analyzed semi-structured interviews, interpreting group boundaries, access, exclusion, and the role of formal reflection sessions.",
        finding:
          "Tight peer groups provided belonging but could also create exclusivity; structured curriculum sessions offered occasional bridges to different experiences and viewpoints outside those in-groups.",
        value:
          "The work shows how qualitative network mapping can make hidden experiences of belonging and exclusion discussable without reducing support to a centrality score.",
        caveat:
          "This was a qualitative study of seven volunteers and 61 named alters at one medical school. Personal maps reflect participant meaning rather than a complete sociocentric network, and the study cannot estimate prevalence or show that reflection sessions caused enduring network change.",
        tags: ["Qualitative SNA", "Belonging", "Medical students"],
      },
      "zh-hant": {
        title: "一年級醫學生繪出內群體、排斥及課程支援",
        imageAlt:
          "真人照片呈現醫學生在反思工作坊排列七張手繪社會網絡圖卡",
        summary:
          "七名一年級醫學生建立包含61名他者的個人社會網絡圖，並在半結構訪談中討論。質性網絡分析識別內群體與排他情況，而課程反思課節有時會引入學生慣常圈子以外的觀點。",
        actors: "七名焦點一年級醫學生，以及他們放入個人社交與支援圖的61人",
        relations: "由參與者界定，代表重要同儕、家人、教師或其他支援關係的人際連結",
        analysis:
          "研究以參與者繪畫的社會網絡圖引出網絡結構，再對半結構訪談作主題分析，詮釋群體邊界、渠道、排斥及正式反思課節的作用。",
        finding:
          "緊密同儕小組提供歸屬感，但亦可能造成排他；結構化課程課節偶爾可橋接內群體以外的不同經驗與觀點。",
        value:
          "研究顯示質性網絡繪圖如何令隱藏的歸屬與排斥經驗可以被討論，而不把支援壓縮為一個中心性分數。",
        caveat:
          "這是單一醫學院七名志願者及61名被提名他者的質性研究。個人圖反映參與者意義而非完整社會中心網絡，亦不能估計普遍程度或證明反思課節造成持久網絡轉變。",
        tags: ["質性SNA", "歸屬感", "醫學生"],
      },
      "zh-hans": {
        title: "一年级医学生绘出内群体、排斥及课程支持",
        imageAlt:
          "真人照片呈现医学生在反思工作坊排列七张手绘社会网络图卡",
        summary:
          "七名一年级医学生建立包含61名他者的个人社会网络图，并在半结构访谈中讨论。质性网络分析识别内群体与排他情况，而课程反思课节有时会引入学生惯常圈子以外的观点。",
        actors: "七名焦点一年级医学生，以及他们放入个人社交与支持图的61人",
        relations: "由参与者界定，代表重要同伴、家人、教师或其他支持关系的人际连接",
        analysis:
          "研究用参与者绘画的社会网络图引出网络结构，再对半结构访谈作主题分析，解释群体边界、渠道、排斥及正式反思课节的作用。",
        finding:
          "紧密同伴小组提供归属感，但也可能造成排他；结构化课程课节偶尔可桥接内群体以外的不同经验与观点。",
        value:
          "研究显示质性网络绘图如何使隐藏的归属与排斥经验可以被讨论，而不把支持压缩为一个中心性分数。",
        caveat:
          "这是单一医学院七名志愿者及61名被提名他者的质性研究。个人图反映参与者意义而非完整社会中心网络，也不能估计普遍程度或证明反思课节造成持久网络转变。",
        tags: ["质性SNA", "归属感", "医学生"],
      },
    },
  },
  {
    id: "sna-027",
    sequence: 27,
    slug: "international-medical-student-informal-networks",
    type: "journal",
    authors: ["Yan Zhou", "Nicolaas Bos", "Agnes Diemers", "Jasperina Brouwer"],
    venue: "Medical Education Online",
    citation: "Medical Education Online, 28(1), Article 2162253",
    doi: "10.1080/10872981.2022.2162253",
    sourceUrl:
      "https://www.tandfonline.com/doi/full/10.1080/10872981.2022.2162253",
    sourceLabel: "Medical Education Online",
    publishedAt: "2023-01-02",
    year: 2023,
    reviewedAt: "2026-08-06",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-027-international-medical-student-informal-networks.png",
    summaryImage:
      "/images/news/summary/sna-027-international-medical-student-informal-networks-summary.png",
    text: {
      en: {
        title:
          "Learning communities and nationality homophily in informal medical student networks",
        imageAlt:
          "Photograph of medical students studying and socializing in a campus commons, with several colored relationship layers crossing groups",
        summary:
          "Sixty-nine first-year and 51 second-year medical students reported 2,890 relationships across five informal networks: study support, collaboration, friendship, information sharing, and learning from others. Learning-community membership and nationality homophily structured several networks, raising questions about international-student integration.",
        actors:
          "first- and second-year medical students within an international undergraduate medical program",
        relations:
          "directed nominations across five distinct relations: study support, collaboration, friendship, information sharing, and whom a student learned from",
        analysis:
          "The authors built five relational matrices, described network structure and subgroup patterns, and used QAP procedures to test associations between ties, learning-community membership, nationality, and other attributes while respecting dyadic dependence.",
        finding:
          "Learning-community membership organized many informal connections, and nationality homophily appeared in several layers, indicating that formal grouping did not fully dissolve boundaries relevant to international integration.",
        value:
          "By separating five relations, the study helps curriculum teams identify whether a student lacks friendship, study help, information, or learning access instead of treating integration as one undifferentiated outcome.",
        caveat:
          "The sample covered 120 students in one program, relations were self-reported at one period, and missing or capped nominations may affect subgroup patterns. QAP detects association, not whether learning communities or nationality caused tie formation or educational outcomes.",
        tags: ["Medical education", "Homophily", "Multiplex networks"],
      },
      "zh-hant": {
        title: "非正式醫學生網絡中的學習社群與國籍同質性",
        imageAlt:
          "真人照片呈現醫學生在校園共享空間溫習與交流，多層彩色關係線跨越不同小組",
        summary:
          "69名一年級及51名二年級醫學生報告五種非正式網絡共2,890段關係：學習支援、協作、友誼、資訊分享及向他人學習。學習社群成員身分與國籍同質性組織多個網絡，引發國際學生融入問題。",
        actors: "一個國際本科醫學課程的一、二年級醫學生",
        relations: "五種不同關係的有向提名：學習支援、協作、友誼、資訊分享及學生向誰學習",
        analysis:
          "作者建立五個關係矩陣，描述網絡結構及分組模式，並以QAP程序檢驗連結與學習社群、國籍及其他屬性的關聯，同時處理二元關係依賴。",
        finding:
          "學習社群成員身分組織許多非正式連結，多個網絡層亦出現國籍同質性，顯示正式分組未完全消除與國際融入有關的邊界。",
        value:
          "研究把五種關係分開，協助課程團隊辨別學生欠缺的是友誼、學習協助、資訊還是學習渠道，而非把融入視為單一結果。",
        caveat:
          "樣本只包括一個課程120名學生，關係在一個時段由學生自陳，缺失或提名上限可能影響分組模式。QAP識別關聯，不能證明學習社群或國籍造成連結形成或教育結果。",
        tags: ["醫學教育", "同質性", "多重網絡"],
      },
      "zh-hans": {
        title: "非正式医学生网络中的学习社群与国籍同质性",
        imageAlt:
          "真人照片呈现医学生在校园共享空间复习与交流，多层彩色关系线跨越不同小组",
        summary:
          "69名一年级及51名二年级医学生报告五种非正式网络共2,890段关系：学习支持、协作、友谊、信息分享及向他人学习。学习社群成员身份与国籍同质性组织多个网络，引发国际学生融入问题。",
        actors: "一个国际本科医学课程的一、二年级医学生",
        relations: "五种不同关系的有向提名：学习支持、协作、友谊、信息分享及学生向谁学习",
        analysis:
          "作者建立五个关系矩阵，描述网络结构及分组模式，并用QAP程序检验连接与学习社群、国籍及其他属性的关联，同时处理二元关系依赖。",
        finding:
          "学习社群成员身份组织许多非正式连接，多个网络层也出现国籍同质性，显示正式分组未完全消除与国际融入有关的边界。",
        value:
          "研究把五种关系分开，帮助课程团队辨别学生缺少的是友谊、学习帮助、信息还是学习渠道，而不是把融入视为单一结果。",
        caveat:
          "样本只包括一个课程120名学生，关系在一个时段由学生自报，缺失或提名上限可能影响分组模式。QAP识别关联，不能证明学习社群或国籍造成连接形成或教育结果。",
        tags: ["医学教育", "同质性", "多重网络"],
      },
    },
  },
  {
    id: "sna-028",
    sequence: 28,
    slug: "education-outside-classroom-peer-networks",
    type: "journal",
    authors: [
      "Jan Ellinger",
      "Filip Mess",
      "Joachim Bachner",
      "Jakob von Au",
      "Christoph Mall",
    ],
    venue: "Frontiers in Psychology",
    citation: "Frontiers in Psychology, 14, Article 1031693",
    doi: "10.3389/fpsyg.2023.1031693",
    sourceUrl:
      "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1031693/full",
    sourceLabel: "Frontiers in Psychology",
    publishedAt: "2023-02-02",
    year: 2023,
    reviewedAt: "2026-08-07",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-028-education-outside-classroom-peer-networks.png",
    summaryImage:
      "/images/news/summary/sna-028-education-outside-classroom-peer-networks-summary.png",
    text: {
      en: {
        title:
          "Education outside the classroom and the evolution of peer interaction networks",
        imageAlt:
          "Side-by-side photograph of an outdoor student discussion circle and an indoor class, with contrasting peer-network overlays",
        summary:
          "One class using regular education outside the classroom with 24 students was compared with a 26-student class. Longitudinal interaction, relatedness, and friendship networks were examined with stochastic actor-oriented and exponential random graph models; changes were inconsistent and strong gender homophily remained.",
        actors:
          "students in one education-outside-the-classroom class and one comparison class",
        relations:
          "reported lesson and break-time interactions, relatedness, and friendship links observed across the study waves",
        analysis:
          "The authors used stochastic actor-oriented models for network evolution and co-evolution and ERGMs for selected cross-sectional structures, testing reciprocity, transitivity, gender and residence homophily, and grouping patterns.",
        finding:
          "The study did not find consistent co-evolution between the focal networks or uniform interaction gains; both classes showed grouping, and pronounced gender homophily contributed to fragmentation in the outdoor-learning class.",
        value:
          "The results temper assumptions that changing the learning location automatically integrates peers and demonstrate how longitudinal models can distinguish selection, structure, and changing relationships.",
        caveat:
          "Only two small, non-randomly assigned classes were studied, so classroom history, teachers, residence, gender composition, measurement waves, and model specification can drive differences. Null or inconsistent parameters are not evidence that outdoor education has no other benefits.",
        tags: ["Outdoor education", "SAOM", "Peer networks"],
      },
      "zh-hant": {
        title: "課室外教育與同儕互動網絡的演變",
        imageAlt:
          "並排真人照片呈現戶外學生討論圈與室內課堂，兩邊疊加不同形態的同儕網絡",
        summary:
          "研究比較一個定期在課室外學習的24人班別與一個26人班別，並以隨機行動者導向模型及指數隨機圖模型檢驗縱向互動、關聯感與友誼網絡。變化並不一致，強烈性別同質性仍然存在。",
        actors: "一個課室外教育班別及一個比較班別的學生",
        relations: "在多個研究波次報告的課堂與小息互動、關聯感及友誼連結",
        analysis:
          "作者以隨機行動者導向模型分析網絡演變及共同演變，並以ERGM分析部分橫斷面結構，檢驗互惠、傳遞、性別與居住地同質性及分組模式。",
        finding:
          "研究未發現焦點網絡之間有一致共同演變或普遍互動增長；兩班均出現分組，而明顯性別同質性令戶外學習班別更分割。",
        value:
          "結果修正改變學習地點便會自動促進同儕融合的假設，並示範縱向模型如何區分選擇、結構及變動關係。",
        caveat:
          "研究只有兩個非隨機分配的小班，因此班級歷史、教師、居住地、性別組成、量度波次及模型設定均可造成差異。零值或不一致參數不表示課室外教育沒有其他益處。",
        tags: ["戶外教育", "隨機行動者導向模型", "同儕網絡"],
      },
      "zh-hans": {
        title: "课堂外教育与同伴互动网络的演变",
        imageAlt:
          "并排真人照片呈现户外学生讨论圈与室内课堂，两边叠加不同形态的同伴网络",
        summary:
          "研究比较一个定期在课堂外学习的24人班级与一个26人班级，并用随机行动者导向模型及指数随机图模型检验纵向互动、关联感与友谊网络。变化并不一致，强烈性别同质性仍然存在。",
        actors: "一个课堂外教育班级及一个比较班级的学生",
        relations: "在多个研究波次报告的课堂与课间互动、关联感及友谊连接",
        analysis:
          "作者用随机行动者导向模型分析网络演变及共同演变，并用ERGM分析部分横断面结构，检验互惠、传递、性别与居住地同质性及分组模式。",
        finding:
          "研究未发现焦点网络之间有一致共同演变或普遍互动增长；两班均出现分组，而明显性别同质性使户外学习班级更分割。",
        value:
          "结果修正改变学习地点便会自动促进同伴融合的假设，并示范纵向模型如何区分选择、结构及变动关系。",
        caveat:
          "研究只有两个非随机分配的小班，因此班级历史、教师、居住地、性别组成、测量波次及模型设定均可造成差异。零值或不一致参数不表示课堂外教育没有其他益处。",
        tags: ["户外教育", "随机行动者导向模型", "同伴网络"],
      },
    },
  },
  {
    id: "sna-029",
    sequence: 29,
    slug: "pandemic-online-medical-collaboration-networks",
    type: "journal",
    authors: [
      "Yan Zhou",
      "Xiaoming Xu",
      "Johanna Schönrock-Adema",
      "Jasperina Brouwer",
      "Nicolaas A. Bos",
      "Agnes D. Diemers",
    ],
    venue: "Frontiers in Medicine",
    citation: "Frontiers in Medicine, 10, Article 1242638",
    doi: "10.3389/fmed.2023.1242638",
    sourceUrl:
      "https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2023.1242638/full",
    sourceLabel: "Frontiers in Medicine",
    publishedAt: "2023-08-09",
    year: 2023,
    reviewedAt: "2026-08-08",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-029-pandemic-online-medical-collaboration-networks.png",
    summaryImage:
      "/images/news/summary/sna-029-pandemic-online-medical-collaboration-networks-summary.png",
    text: {
      en: {
        title:
          "Online collaborative learning changed medical students' social networks without lowering grades",
        imageAlt:
          "Split photograph of medical students studying together on campus and separately online, with dense and sparse network overlays",
        summary:
          "The study compared 102 pre-pandemic and 167 pandemic-era medical students across five out-of-class networks: study support, collaboration, friendship, information sharing, and learning from others. Networks were generally smaller during online collaborative learning, but academic performance did not decline.",
        actors:
          "medical students in a pre-pandemic cohort and a separate cohort studying during pandemic-era online collaboration",
        relations:
          "up to 25 directed nominations per student across study support, collaboration, friendship, information sharing, and learned-from networks",
        analysis:
          "Researchers constructed five networks for each cohort, compared structural and subgroup patterns, used Kruskal-Wallis tests for academic performance, and interpreted open-ended responses about students' online learning experiences.",
        finding:
          "Students in the pandemic-era cohort reported smaller informal networks and some subgroup differences, yet their grades were not lower, showing that network contraction and academic performance did not move in lockstep.",
        value:
          "The paper separates several kinds of social access and cautions institutions to monitor relational opportunity during online learning even when aggregate grades appear stable.",
        caveat:
          "The cohorts contained different students and were observed cross-sectionally, so pandemic conditions, curriculum, assessment, composition, and self-report can confound the comparison. Up-to-25 nominations and out-of-class reports miss some interaction, and stable grades do not prove equivalent learning.",
        tags: ["Online collaboration", "Medical education", "COVID-19"],
      },
      "zh-hant": {
        title: "線上協作學習改變醫學生社交網絡但未降低成績",
        imageAlt:
          "分屏真人照片呈現醫學生在校園共同溫習及在家分開線上學習，疊加稠密與稀疏網絡",
        summary:
          "研究比較102名疫情前與167名疫情期間醫學生的五種課外網絡：學習支援、協作、友誼、資訊分享及向他人學習。線上協作學習期間的網絡普遍較小，但學業表現沒有下降。",
        actors: "疫情前醫學生群組，以及疫情期間以線上協作方式學習的另一群醫學生",
        relations: "每名學生在學習支援、協作、友誼、資訊分享及向誰學習網絡中最多25個有向提名",
        analysis:
          "研究者為每個群組建立五個網絡，比較結構及分組模式，以Kruskal-Wallis檢驗學業表現，並詮釋關於線上學習經驗的開放式回應。",
        finding:
          "疫情期間群組報告較小型非正式網絡及部分分組差異，但成績並沒有較低，顯示網絡收縮與學業表現不一定同步改變。",
        value:
          "論文把多種社交渠道分開，提醒院校即使總體成績穩定，仍應在線上學習期間監察學生可取得的關係機會。",
        caveat:
          "兩個群組由不同學生組成，並以橫斷面方式觀察，因此疫情情境、課程、評核、組成及自陳均可混淆比較。最多25個提名及課外報告會遺漏部分互動，成績穩定也不證明學習等同。",
        tags: ["線上協作", "醫學教育", "新冠疫情"],
      },
      "zh-hans": {
        title: "在线协作学习改变医学生社交网络但未降低成绩",
        imageAlt:
          "分屏真人照片呈现医学生在校园共同复习及在家分开在线学习，叠加稠密与稀疏网络",
        summary:
          "研究比较102名疫情前与167名疫情期间医学生的五种课外网络：学习支持、协作、友谊、信息分享及向他人学习。在线协作学习期间的网络普遍更小，但学业表现没有下降。",
        actors: "疫情前医学生群组，以及疫情期间以在线协作方式学习的另一群医学生",
        relations: "每名学生在学习支持、协作、友谊、信息分享及向谁学习网络中最多25个有向提名",
        analysis:
          "研究者为每个群组建立五个网络，比较结构及分组模式，用Kruskal-Wallis检验学业表现，并解释关于在线学习经验的开放式回应。",
        finding:
          "疫情期间群组报告较小型非正式网络及部分分组差异，但成绩并没有更低，显示网络收缩与学业表现不一定同步改变。",
        value:
          "论文把多种社交渠道分开，提醒院校即使总体成绩稳定，仍应在在线学习期间监测学生可获得的关系机会。",
        caveat:
          "两个群组由不同学生组成，并用横断面方式观察，因此疫情情境、课程、评估、组成及自报均可混淆比较。最多25个提名及课外报告会遗漏部分互动，成绩稳定也不证明学习等同。",
        tags: ["在线协作", "医学教育", "新冠疫情"],
      },
    },
  },
  {
    id: "sna-030",
    sequence: 30,
    slug: "campus-behavioral-big-data-peer-networks",
    type: "journal",
    authors: [
      "Yuan Zhou",
      "Xiao Meng",
      "Jiayin Wang",
      "Xu Mo",
      "Sa Jiang",
      "Chengjun Dai",
      "Mengting Liu",
    ],
    venue: "Sustainability",
    citation: "Sustainability, 15(22), Article 15762",
    doi: "10.3390/su152215762",
    sourceUrl: "https://www.mdpi.com/2071-1050/15/22/15762",
    sourceLabel: "Sustainability",
    publishedAt: "2023-11-09",
    year: 2023,
    reviewedAt: "2026-08-10",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-030-campus-behavioral-big-data-peer-networks.png",
    summaryImage:
      "/images/news/summary/sna-030-campus-behavioral-big-data-peer-networks-summary.png",
    text: {
      en: {
        title:
          "Inferring daily college peer networks from campus behavioral data",
        imageAlt:
          "Photograph of students crossing a university quad at sunset, with anonymous dotted movement paths protected by a translucent shield",
        summary:
          "Behavioral records for 4,738 undergraduates entering in 2018 were used to infer daily peer networks from co-occurring attendance, dining, residence, and bathing activity. Communities shifted from residence-centered to classmate-centered patterns, while peer achievement and scholarship status were associated.",
        actors:
          "4,738 undergraduates in one entry cohort represented across repeated days of campus activity",
        relations:
          "inferred daily peer links based on temporally and spatially proximate campus behaviors such as class attendance, eating, residence, and bathing",
        analysis:
          "The study constructed day-level behavioral networks, detected communities with Louvain methods, summarized density and clustering, tracked community composition over time, and tested associations between peer features and scholarship achievement.",
        finding:
          "Early communities were more residence-centered and later became more classmate-centered; geography and living areas shaped ties, and high-scholarship students were more likely to connect with similarly awarded peers.",
        value:
          "The large longitudinal trace dataset shows how campus routines can reveal changing opportunity structures, while also making explicit the need to validate what a digital co-occurrence tie actually represents.",
        caveat:
          "Co-location and similar routines are proxies, not confirmed friendship, advice, or collaboration. One university cohort, institutional systems, privacy filtering, unmeasured prior selection, and many daily observations limit generalization and causal claims about peers or scholarships.",
        tags: ["Behavioral traces", "Campus networks", "Peer achievement"],
      },
      "zh-hant": {
        title: "以校園行為數據推斷大學生日常同儕網絡",
        imageAlt:
          "真人照片呈現學生在日落時穿過大學廣場，匿名點狀移動路徑受到半透明盾形圖層保護",
        summary:
          "研究利用2018年入學的4,738名本科生行為紀錄，按同時出現的上課、用餐、住宿及洗浴活動推斷每日同儕網絡。社群由以宿舍為中心逐步轉為以同班同學為中心，同儕成績與獎學金狀況亦呈關聯。",
        actors: "一個入學群組4,738名本科生，按重複多日校園活動呈現",
        relations: "根據上課、用餐、住宿及洗浴等校園行為在時間與空間上接近而推斷的每日同儕連結",
        analysis:
          "研究建立每日行為網絡，以Louvain方法偵測社群，總結密度及聚類，追蹤社群組成隨時間變化，並檢驗同儕特徵與獎學金成績的關聯。",
        finding:
          "早期社群較以宿舍為中心，其後較以同班同學為中心；地理與生活區域塑造連結，而高獎學金學生較常與同樣獲獎的同儕連接。",
        value:
          "大型縱向軌跡資料顯示校園日常活動如何揭示變動的接觸機會，同時突顯必須驗證數碼共同出現連結究竟代表甚麼。",
        caveat:
          "共同位置及相似日常是代理指標，並非已確認友誼、建議或協作。單一大學群組、校內系統、私隱篩選、未量度既往選擇及大量每日觀察，均限制推廣及對同儕或獎學金的因果主張。",
        tags: ["行為軌跡", "校園網絡", "同儕成績"],
      },
      "zh-hans": {
        title: "用校园行为数据推断大学生日常同伴网络",
        imageAlt:
          "真人照片呈现学生在日落时穿过大学广场，匿名点状移动路径受到半透明盾形图层保护",
        summary:
          "研究利用2018年入学的4,738名本科生行为记录，按同时出现的上课、用餐、住宿及洗浴活动推断每日同伴网络。社群从以宿舍为中心逐步转为以同班同学为中心，同伴成绩与奖学金状况也呈关联。",
        actors: "一个入学群组4,738名本科生，按重复多日校园活动呈现",
        relations: "根据上课、用餐、住宿及洗浴等校园行为在时间与空间上接近而推断的每日同伴连接",
        analysis:
          "研究建立每日行为网络，用Louvain方法检测社群，总结密度及聚类，追踪社群组成随时间变化，并检验同伴特征与奖学金成绩的关联。",
        finding:
          "早期社群更以宿舍为中心，其后更以同班同学为中心；地理与生活区域塑造连接，而高奖学金学生更常与同样获奖的同伴连接。",
        value:
          "大型纵向轨迹数据显示校园日常活动如何揭示变动的接触机会，同时突显必须验证数字共同出现连接究竟代表什么。",
        caveat:
          "共同位置及相似日常是代理指标，并非已确认友谊、建议或协作。单一大学群组、校内系统、隐私筛选、未测量既往选择及大量每日观察，均限制推广及对同伴或奖学金的因果主张。",
        tags: ["行为轨迹", "校园网络", "同伴成绩"],
      },
    },
  },
  {
    id: "sna-031",
    sequence: 31,
    slug: "stem-course-coenrollment-networks",
    type: "journal",
    authors: ["Laura R. Ramsey", "Wanchunzi Yu", "Thomas Kling", "Audrey Kling"],
    venue: "Journal of College Student Retention: Research, Theory & Practice",
    citation:
      "Journal of College Student Retention: Research, Theory & Practice, 27(4), 933-955",
    doi: "10.1177/15210251231215787",
    sourceUrl:
      "https://journals.sagepub.com/doi/10.1177/15210251231215787",
    sourceLabel:
      "Journal of College Student Retention: Research, Theory & Practice",
    publishedAt: "2023-12-17",
    year: 2023,
    reviewedAt: "2026-08-11",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-031-stem-course-coenrollment-networks.png",
    summaryImage:
      "/images/news/summary/sna-031-stem-course-coenrollment-networks-summary.png",
    text: {
      en: {
        title:
          "Classroom connections in STEM through repeated course co-enrollment networks",
        imageAlt:
          "Photograph of STEM students working at interdisciplinary lab tables, with blank course cards and repeated co-enrollment ties above them",
        summary:
          "Two cohorts of 169 STEM students each were connected when they shared an exact biology, computer science, or mathematics course section during their first two years. Repeated co-enrollment occurred more often than 10,000 random section simulations and network features predicted grades and graduation after covariate adjustment.",
        actors:
          "338 biology, computer science, and mathematics students in two entering cohorts at a regional university",
        relations:
          "undirected weighted co-enrollment links counting exact course sections that a pair of students shared during the first two years",
        analysis:
          "The researchers compared degree, repeated connections and strongest edge, built major-specific networks, ran 10,000 Monte Carlo random section assignments, and used adjusted models to relate network exposure to grades and graduation.",
        finding:
          "Students shared repeated course sections more often than random schedules predicted, demographic differences were generally small, and stronger classroom connection measures were associated with academic outcomes after observed controls.",
        value:
          "Administrative enrollment data can reveal durable opportunities for peer contact without asking students to recall every classmate, giving institutions a structural view of how curricula repeatedly bring students together.",
        caveat:
          "Co-enrollment is an opportunity for contact, not evidence of friendship, collaboration, or support. The study used one regional university and observational cohorts; scheduling, major pathways, prior attainment, and unmeasured selection can explain both network position and outcomes.",
        tags: ["STEM retention", "Co-enrollment", "Administrative networks"],
      },
      "zh-hant": {
        title: "透過重複共同修課網絡理解STEM課堂連結",
        imageAlt:
          "真人照片呈現STEM學生在跨學科實驗桌協作，上方以空白課程卡及重複共修連結相連",
        summary:
          "兩個各169人的STEM學生群組，在首兩年同修完全相同的生物、電腦科學或數學班別時建立連結。重複共同修課比10,000次隨機班別模擬更常出現，控制協變量後，網絡特徵亦預測成績及畢業。",
        actors: "一所地區大學兩個入學群組共338名生物、電腦科學及數學學生",
        relations: "計算一對學生在首兩年共同修讀完全相同課程班別次數的無向加權連結",
        analysis:
          "研究比較度數、重複連結及最強連結，建立主修科網絡，運行10,000次Monte Carlo隨機班別分配，並以調整模型連結網絡接觸、成績與畢業。",
        finding:
          "學生重複共同修課的次數高於隨機課表預期，人口特徵差異大致較小，而較強課堂連結指標在控制已觀察因素後與學業結果相關。",
        value:
          "行政修課資料無需學生回憶每名同學，便可揭示持續同儕接觸機會，讓院校從結構上檢視課程如何反覆把學生聚在一起。",
        caveat:
          "共同修課是接觸機會，不是友誼、協作或支援證據。研究只涵蓋一所地區大學及觀察群組；排課、主修路徑、既往成績及未量度選擇均可同時解釋網絡位置與結果。",
        tags: ["STEM持續修讀", "共同修課", "行政資料網絡"],
      },
      "zh-hans": {
        title: "通过重复共同修课网络理解STEM课堂连接",
        imageAlt:
          "真人照片呈现STEM学生在跨学科实验桌协作，上方以空白课程卡及重复共修连接相连",
        summary:
          "两个各169人的STEM学生群组，在首两年同修完全相同的生物、计算机科学或数学班级时建立连接。重复共同修课比10,000次随机班级模拟更常出现，控制协变量后，网络特征也预测成绩及毕业。",
        actors: "一所地区大学两个入学群组共338名生物、计算机科学及数学学生",
        relations: "计算一对学生在首两年共同修读完全相同课程班级次数的无向加权连接",
        analysis:
          "研究比较度数、重复连接及最强连接，建立专业网络，运行10,000次Monte Carlo随机班级分配，并用调整模型连接网络接触、成绩与毕业。",
        finding:
          "学生重复共同修课的次数高于随机课表预期，人口特征差异大致较小，而更强课堂连接指标在控制已观察因素后与学业结果相关。",
        value:
          "行政修课数据无需学生回忆每名同学，便可揭示持续同伴接触机会，让院校从结构上检视课程如何反复把学生聚在一起。",
        caveat:
          "共同修课是接触机会，不是友谊、协作或支持证据。研究只涵盖一所地区大学及观察群组；排课、专业路径、既往成绩及未测量选择均可同时解释网络位置与结果。",
        tags: ["STEM持续修读", "共同修课", "行政数据网络"],
      },
    },
  },
  {
    id: "sna-032",
    sequence: 32,
    slug: "school-research-network-intentionality",
    type: "journal",
    authors: ["Frank Cornelissen", "Ros McLellan", "Alan Daly"],
    venue: "Frontiers in Education",
    citation: "Frontiers in Education, 9, Article 1413128",
    doi: "10.3389/feduc.2024.1413128",
    sourceUrl:
      "https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1413128/full",
    sourceLabel: "Frontiers in Education",
    publishedAt: "2024-06-07",
    year: 2024,
    reviewedAt: "2026-08-14",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-032-school-research-network-intentionality.png",
    summaryImage:
      "/images/news/summary/sna-032-school-research-network-intentionality-summary.png",
    text: {
      en: {
        title:
          "Network intentionality and educators' research connections across schools",
        imageAlt:
          "Photograph of teachers and researchers meeting around a shared table, with eight school symbols connected to a research hub",
        summary:
          "A survey of educators in eight secondary schools examined personal research-network size, network intentionality, and perceived research engagement. Among 526 eligible educators with a 56.2 percent response rate, intentional networking and research engagement independently predicted larger reported research networks.",
        actors:
          "educators working in eight secondary schools participating in the Cambridge SUPER research partnership",
        relations:
          "each educator's reported professional contacts used to access, discuss, produce, or apply educational research",
        analysis:
          "The study measured personal network size, a network-intentionality scale and perceived research engagement, then fitted regression and mediation models to test their direct and indirect associations.",
        finding:
          "Network intentionality showed a strong positive coefficient and perceived research engagement also predicted network size, but the proposed indirect mediation path was not statistically supported.",
        value:
          "The paper identifies deliberate relationship building as a distinct professional practice and gives school partnerships a way to examine whether research access extends beyond already connected enthusiasts.",
        caveat:
          "The evidence is cross-sectional and self-reported within one research-school partnership, only 56.2 percent responded, and larger networks are not automatically higher quality. Regression and a null mediation estimate cannot determine direction or program impact.",
        tags: ["School research", "Network intentionality", "Evidence use"],
      },
      "zh-hant": {
        title: "網絡意向與教育者跨校研究連結",
        imageAlt:
          "真人照片呈現教師與研究人員圍桌交流，八個學校符號連向共同研究樞紐",
        summary:
          "研究調查八所中學教育者的個人研究網絡規模、網絡意向及感知研究參與。526名合資格教育者的回應率為56.2%；刻意建立網絡及研究參與各自預測較大的自陳研究網絡。",
        actors: "參與劍橋SUPER研究伙伴計劃之八所中學的教育工作者",
        relations: "每名教育者報告，用於取得、討論、產生或應用教育研究的專業聯絡",
        analysis:
          "研究量度個人網絡規模、網絡意向量表及感知研究參與，再配適迴歸與中介模型，檢驗直接及間接關聯。",
        finding:
          "網絡意向呈強正向係數，感知研究參與亦預測網絡規模，但所提出的間接中介路徑沒有統計支持。",
        value:
          "論文把刻意建立關係識別為一項獨立專業實踐，並讓學校伙伴檢視研究渠道是否延伸至原本已高度連結者以外。",
        caveat:
          "證據來自一個研究學校伙伴計劃的橫斷面自陳資料，只有56.2%回應，而更大網絡並不自動代表更高品質。迴歸及零中介估計不能判斷方向或計劃成效。",
        tags: ["學校研究", "網絡意向", "證據使用"],
      },
      "zh-hans": {
        title: "网络意向与教育者跨校研究连接",
        imageAlt:
          "真人照片呈现教师与研究人员围桌交流，八个学校符号连向共同研究枢纽",
        summary:
          "研究调查八所中学教育者的个人研究网络规模、网络意向及感知研究参与。526名符合条件教育者的回应率为56.2%；有意建立网络及研究参与各自预测更大的自报研究网络。",
        actors: "参与剑桥SUPER研究伙伴项目之八所中学的教育工作者",
        relations: "每名教育者报告，用于获得、讨论、产生或应用教育研究的专业联系",
        analysis:
          "研究测量个人网络规模、网络意向量表及感知研究参与，再拟合回归与中介模型，检验直接及间接关联。",
        finding:
          "网络意向呈强正向系数，感知研究参与也预测网络规模，但所提出的间接中介路径没有统计支持。",
        value:
          "论文把有意建立关系识别为一项独立专业实践，并让学校伙伴检视研究渠道是否延伸到原本已高度连接者以外。",
        caveat:
          "证据来自一个研究学校伙伴项目的横断面自报数据，只有56.2%回应，而更大网络并不自动代表更高质量。回归及零中介估计不能判断方向或项目成效。",
        tags: ["学校研究", "网络意向", "证据使用"],
      },
    },
  },
  {
    id: "sna-033",
    sequence: 33,
    slug: "school-mental-health-knowledge-brokerage",
    type: "journal",
    authors: ["Jennifer Turner", "Stephen MacGregor", "Sharon Friesen"],
    venue: "Frontiers in Education",
    citation: "Frontiers in Education, 9, Article 1457546",
    doi: "10.3389/feduc.2024.1457546",
    sourceUrl:
      "https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1457546/full",
    sourceLabel: "Frontiers in Education",
    publishedAt: "2024-12-09",
    year: 2024,
    reviewedAt: "2026-08-15",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-033-school-mental-health-knowledge-brokerage.png",
    summaryImage:
      "/images/news/summary/sna-033-school-mental-health-knowledge-brokerage-summary.png",
    text: {
      en: {
        title:
          "Educational leaders as knowledge brokers for school-based mental health",
        imageAlt:
          "Photograph of school mental-health professionals meeting in separated groups, with two central brokers linking the network",
        summary:
          "Thirty-one of 37 eligible leaders in one British Columbia district reported five mental-health relations, and five leaders were interviewed. The multiplex network was sparse and fragmented; an assistant superintendent and coordinator were prominent brokers, while principals had comparatively limited reach.",
        actors:
          "school and district educational leaders across 20 elementary, five middle, and five secondary schools",
        relations:
          "directed nominations for generic contact, knowledge, opinion, support, and co-planning about school-based mental health",
        analysis:
          "Researchers dichotomized at a monthly-contact threshold, combined five layers into a multiplex network, calculated density, in-degree, betweenness, centralization, fragmentation, transitivity and reciprocity, used 20,000-permutation role comparisons, and integrated five interviews.",
        finding:
          "Multiplex density was 0.099 and fragmentation 0.782; the assistant superintendent and coordinator were key direct and brokerage sources, while role differences in betweenness did not reach significance.",
        value:
          "The map identifies where mental-health knowledge could stall between district and school levels and supports distributing access across roles rather than depending on one highly visible broker.",
        caveat:
          "The purposive case covered one district, 31 survey respondents and five interviews. Roster consent, the monthly threshold, multiplex aggregation and self-reported nominations affect the network; the cross-sectional case cannot establish that brokerage improved practice or student wellbeing.",
        tags: ["Knowledge brokerage", "School mental health", "Leadership networks"],
      },
      "zh-hant": {
        title: "教育領導者作為校本精神健康知識中介",
        imageAlt:
          "真人照片呈現學校精神健康專業人員分組交流，兩名核心中介連接整個網絡",
        summary:
          "加拿大卑詩省一個地區37名合資格領導者中31人報告五種精神健康關係，另有5人受訪。多重網絡稀疏而分割；一名助理總監及一名統籌員是顯著中介，校長的觸及範圍相對有限。",
        actors: "20所小學、5所初中及5所中學的校級與地區教育領導者",
        relations: "有關校本精神健康的一般聯絡、知識、意見、支援及共同策劃有向提名",
        analysis:
          "研究以每月接觸作二元門檻，把五層合成多重網絡，計算密度、入度、中介、集中化、分割、傳遞及互惠，以20,000次置換比較角色，並結合五次訪談。",
        finding:
          "多重網絡密度為0.099、分割度為0.782；助理總監與統籌員是關鍵直接及中介來源，而角色間的中介差異未達顯著。",
        value:
          "網絡圖識別精神健康知識可能在地區與學校層之間停滯的位置，支持把渠道分散至不同角色，而非依賴一名高度可見的中介。",
        caveat:
          "這個目的性個案只涵蓋一個地區、31名問卷回應者及5次訪談。名冊同意、每月門檻、多重聚合及自陳提名均影響網絡；橫斷面個案不能證明中介改善實踐或學生福祉。",
        tags: ["知識中介", "校本精神健康", "領導網絡"],
      },
      "zh-hans": {
        title: "教育领导者作为校本心理健康知识中介",
        imageAlt:
          "真人照片呈现学校心理健康专业人员分组交流，两名核心中介连接整个网络",
        summary:
          "加拿大不列颠哥伦比亚省一个地区37名符合条件领导者中31人报告五种心理健康关系，另有5人受访。多重网络稀疏而分割；一名助理总监及一名协调员是显著中介，校长的触及范围相对有限。",
        actors: "20所小学、5所初中及5所中学的校级与地区教育领导者",
        relations: "有关校本心理健康的一般联系、知识、意见、支持及共同策划有向提名",
        analysis:
          "研究用每月接触作二元阈值，把五层合成多重网络，计算密度、入度、中介、集中化、分割、传递及互惠，用20,000次置换比较角色，并结合五次访谈。",
        finding:
          "多重网络密度为0.099、分割度为0.782；助理总监与协调员是关键直接及中介来源，而角色间的中介差异未达到显著。",
        value:
          "网络图识别心理健康知识可能在地区与学校层之间停滞的位置，支持把渠道分散到不同角色，而不是依赖一名高度可见的中介。",
        caveat:
          "这个目的性个案只涵盖一个地区、31名问卷回应者及5次访谈。名册同意、每月阈值、多重聚合及自报提名均影响网络；横断面个案不能证明中介改善实践或学生福祉。",
        tags: ["知识中介", "校本心理健康", "领导网络"],
      },
    },
  },
  {
    id: "sna-034",
    sequence: 34,
    slug: "convergent-research-graduate-networks",
    type: "journal",
    authors: [
      "M. Gail Jones",
      "Julianna Nieuwsma",
      "Kathleen Bordewieck",
      "Gina Childers",
      "Steve McDonald",
      "Kimberly Bourne",
      "Maude Cuchiara",
      "Anna-Maria Marshall",
      "Brooke K. Mayer",
      "Christine Ogilvie Hendren",
      "John Classen",
    ],
    venue: "Research in Science Education",
    citation: "Research in Science Education, 55(6), 1757-1772",
    doi: "10.1007/s11165-025-10249-x",
    sourceUrl:
      "https://link.springer.com/article/10.1007/s11165-025-10249-x",
    sourceLabel: "Research in Science Education",
    publishedAt: "2025-04-09",
    year: 2025,
    reviewedAt: "2026-08-17",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-034-convergent-research-graduate-networks.png",
    summaryImage:
      "/images/news/summary/sna-034-convergent-research-graduate-networks-summary.png",
    text: {
      en: {
        title:
          "Graduate student networks in a convergent research environment for wicked problems",
        imageAlt:
          "Photograph of an interdisciplinary graduate research workshop, with separate edge groups converging on a shared central table",
        summary:
          "Twenty-five graduate students in a convergent research center and 28 comparison students across the same universities and programs reported who they knew before and after one year. The center network became denser, while modularity and assortativity by status, affiliation, and institution declined.",
        actors:
          "graduate students in a 10-university, 28-discipline convergent research center and a comparison group in related programs",
        relations:
          "undirected roster-based reports that one student knew another at baseline and after one year",
        analysis:
          "The study compared density, eigenvector centrality, modularity and assortativity by status, affiliation and institution across two waves and groups, alongside survey measures of expectations, impostorism, collaboration and experience.",
        finding:
          "The center network density rose from 0.081 to 0.165 and mean eigenvector centrality from 0.029 to 0.043; affiliation modularity fell from 0.278 to 0.044 and institutional assortativity from 0.510 to 0.070.",
        value:
          "The findings show how a deliberately cross-disciplinary environment can be audited for whether formal boundaries remain visible in actual graduate-student relationships.",
        caveat:
          "The treatment and comparison groups were small and not randomized, baseline composition differed, the tie only measured knowing someone rather than collaboration quality, and many survey outcomes were exploratory. One-year structural change cannot be assigned solely to the center.",
        tags: ["Graduate education", "Convergence research", "Boundary crossing"],
      },
      "zh-hant": {
        title: "面向棘手問題的匯聚研究環境中之研究生網絡",
        imageAlt:
          "真人照片呈現跨學科研究生工作坊，外圍分組逐步匯聚到中央共享圓桌",
        summary:
          "一個匯聚研究中心25名研究生及相同大學與課程的28名比較學生，在一年之前及之後報告彼此是否認識。中心網絡變得更密集，而按身分、隸屬及院校劃分的模組度與同配性下降。",
        actors: "一個涵蓋10所大學及28個學科之匯聚研究中心的研究生，以及相關課程的比較組",
        relations: "在基線及一年後以名冊報告一名學生是否認識另一名學生的無向連結",
        analysis:
          "研究跨兩波與兩組比較密度、特徵向量中心性、按身分、隸屬及院校的模組度與同配性，並配合期望、冒充感、協作及經驗問卷。",
        finding:
          "中心網絡密度由0.081升至0.165，平均特徵向量中心性由0.029升至0.043；隸屬模組度由0.278降至0.044，院校同配性由0.510降至0.070。",
        value:
          "結果示範如何審核刻意跨學科環境，檢視正式邊界是否仍在研究生實際關係中清楚可見。",
        caveat:
          "介入與比較組均小型且非隨機，基線組成有差異，連結只量度是否認識而非協作品質，多項問卷結果亦屬探索性。一年結構變化不能只歸因於研究中心。",
        tags: ["研究生教育", "匯聚研究", "跨越邊界"],
      },
      "zh-hans": {
        title: "面向棘手问题的汇聚研究环境中之研究生网络",
        imageAlt:
          "真人照片呈现跨学科研究生工作坊，外围分组逐步汇聚到中央共享圆桌",
        summary:
          "一个汇聚研究中心25名研究生及相同大学与课程的28名比较学生，在一年之前及之后报告彼此是否认识。中心网络变得更密集，而按身份、隶属及院校划分的模块度与同配性下降。",
        actors: "一个涵盖10所大学及28个学科之汇聚研究中心的研究生，以及相关课程的比较组",
        relations: "在基线及一年后用名册报告一名学生是否认识另一名学生的无向连接",
        analysis:
          "研究跨两波与两组比较密度、特征向量中心性、按身份、隶属及院校的模块度与同配性，并配合期望、冒充感、协作及经验问卷。",
        finding:
          "中心网络密度从0.081升至0.165，平均特征向量中心性从0.029升至0.043；隶属模块度从0.278降至0.044，院校同配性从0.510降至0.070。",
        value:
          "结果示范如何审核有意跨学科环境，检视正式边界是否仍在研究生实际关系中清楚可见。",
        caveat:
          "干预与比较组均小型且非随机，基线组成有差异，连接只测量是否认识而非协作质量，多项问卷结果也属于探索性。一年结构变化不能只归因于研究中心。",
        tags: ["研究生教育", "汇聚研究", "跨越边界"],
      },
    },
  },
  {
    id: "sna-035",
    sequence: 35,
    slug: "rural-high-school-networks-wellbeing",
    type: "journal",
    authors: ["Ping Zhu", "Tingting Wang"],
    venue: "Frontiers in Psychology",
    citation: "Frontiers in Psychology, 16, Article 1501328",
    doi: "10.3389/fpsyg.2025.1501328",
    sourceUrl:
      "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1501328/full",
    sourceLabel: "Frontiers in Psychology",
    publishedAt: "2025-07-17",
    year: 2025,
    reviewedAt: "2026-08-18",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-035-rural-high-school-networks-wellbeing.png",
    summaryImage:
      "/images/news/summary/sna-035-rural-high-school-networks-wellbeing-summary.png",
    text: {
      en: {
        title:
          "Social networks, self-efficacy, and life satisfaction in rural Chinese high schools",
        imageAlt:
          "Photograph of student groups and an interview circle in a rural school courtyard, with one quieter student at the network edge",
        summary:
          "A mixed-method study combined survey-based social-network indicators from 454 rural Chinese high school students with interviews from 28 students. Centrality and network density correlated with self-efficacy, while centrality and network size had smaller associations with life satisfaction.",
        actors:
          "students attending rural Chinese high schools who completed the quantitative study, with 28 selected for interviews",
        relations:
          "reported social contacts summarized through network size, centrality, and density indicators within students' school social environments",
        analysis:
          "The researchers calculated survey-derived network indicators, tested correlations and outcome models for self-efficacy and life satisfaction, and used qualitative interviews to interpret how access, encouragement, and isolation were experienced.",
        finding:
          "Centrality correlated about 0.34 and density about 0.28 with self-efficacy; centrality correlated about 0.20 and network size about 0.22 with life satisfaction, with interviews adding contextual explanations.",
        value:
          "The study focuses attention on relational opportunity in under-resourced settings and demonstrates how interviews can keep numerical network associations connected to students' lived experiences.",
        caveat:
          "The quantitative data are cross-sectional and self-reported, so wellbeing can shape reported networks as readily as networks can shape wellbeing. School selection, common-method bias, indicator construction, and the smaller interview sample prevent causal or broad national conclusions.",
        tags: ["Rural education", "Student wellbeing", "Mixed methods"],
      },
      "zh-hant": {
        title: "中國鄉郊高中社交網絡、自我效能與生活滿意度",
        imageAlt:
          "真人照片呈現鄉郊學校庭院的學生小組與訪談圈，一名較安靜學生位於網絡邊緣",
        summary:
          "一項混合方法研究把454名中國鄉郊高中生的問卷式社交網絡指標與28名學生訪談結合。中心性與網絡密度和自我效能相關，而中心性及網絡規模與生活滿意度的關聯較小。",
        actors: "參與量化研究的中國鄉郊高中學生，其中28人再接受訪談",
        relations: "學生報告的社交聯絡，並在校內社交環境中總結為網絡規模、中心性及密度指標",
        analysis:
          "研究者計算問卷衍生網絡指標，檢驗自我效能與生活滿意度的相關及結果模型，並以質性訪談詮釋學生如何經歷渠道、鼓勵與孤立。",
        finding:
          "中心性與自我效能相關約0.34，密度約0.28；中心性與生活滿意度相關約0.20，網絡規模約0.22，訪談提供額外情境解釋。",
        value:
          "研究把注意力放在資源較少環境中的關係機會，並示範訪談如何把網絡數值關聯連接至學生實際經驗。",
        caveat:
          "量化資料屬橫斷面及自陳，因此福祉可影響報告網絡，程度不亞於網絡影響福祉。學校選擇、共同方法偏差、指標建構及較小訪談樣本，均妨礙因果或全國推論。",
        tags: ["鄉郊教育", "學生福祉", "混合方法"],
      },
      "zh-hans": {
        title: "中国乡村高中社交网络、自我效能与生活满意度",
        imageAlt:
          "真人照片呈现乡村学校庭院的学生小组与访谈圈，一名较安静学生位于网络边缘",
        summary:
          "一项混合方法研究把454名中国乡村高中生的问卷式社交网络指标与28名学生访谈结合。中心性与网络密度和自我效能相关，而中心性及网络规模与生活满意度的关联较小。",
        actors: "参与量化研究的中国乡村高中学生，其中28人再接受访谈",
        relations: "学生报告的社交联系，并在校内社交环境中总结为网络规模、中心性及密度指标",
        analysis:
          "研究者计算问卷衍生网络指标，检验自我效能与生活满意度的相关及结果模型，并用质性访谈解释学生如何经历渠道、鼓励与孤立。",
        finding:
          "中心性与自我效能相关约0.34，密度约0.28；中心性与生活满意度相关约0.20，网络规模约0.22，访谈提供额外情境解释。",
        value:
          "研究把注意力放在资源较少环境中的关系机会，并示范访谈如何把网络数值关联连接到学生实际经验。",
        caveat:
          "量化数据属于横断面及自报，因此福祉可影响报告网络，程度不亚于网络影响福祉。学校选择、共同方法偏差、指标构建及较小访谈样本，均妨碍因果或全国推论。",
        tags: ["乡村教育", "学生福祉", "混合方法"],
      },
    },
  },
  {
    id: "sna-036",
    sequence: 36,
    slug: "student-self-governance-civic-participation-networks",
    type: "journal",
    authors: [
      "Jing Liu",
      "Putu Kerti Nitiasih",
      "Made Hery Santosa",
      "Putu Nanci Riastini",
    ],
    venue: "Scientific Reports",
    citation: "Scientific Reports, 16, Article 4141",
    doi: "10.1038/s41598-025-34205-x",
    sourceUrl: "https://www.nature.com/articles/s41598-025-34205-x",
    sourceLabel: "Scientific Reports",
    publishedAt: "2026-01-27",
    year: 2026,
    reviewedAt: "2026-08-21",
    openAccess: true,
    coverImage:
      "/images/news/covers/sna-036-student-self-governance-civic-participation-networks.png",
    summaryImage:
      "/images/news/summary/sna-036-student-self-governance-civic-participation-networks-summary.png",
    text: {
      en: {
        title:
          "Student self-governance network positions and civic participation outcomes",
        imageAlt:
          "Photograph of a large university governance forum around a central roundtable, with raised hands and six community nodes",
        summary:
          "A study of 237 student-governance participants at an eastern Chinese regional university built a 1,738-edge network with six functional communities. Eigenvector centrality and the community E-I index predicted civic outcomes, while XGBoost classified engagement with 0.781 accuracy and 0.842 AUC.",
        actors:
          "237 students participating in formal self-governance bodies at one regional university in eastern China",
        relations:
          "1,738 reported governance links covering information exchange, decision coordination, and cross-unit collaboration",
        analysis:
          "The authors characterized density, communities, centralities, brokerage and E-I mixing, fitted demographic-adjusted multivariate regressions, and compared logistic regression, support-vector, random-forest and XGBoost classifiers with network-derived features.",
        finding:
          "The network had density 0.062 and six communities in a hierarchical hub-and-spoke form; the central student government bridged peripheral groups, and XGBoost reached 0.781 accuracy with AUC 0.842.",
        value:
          "The study makes unequal structural access within student governance visible and suggests that civic-development opportunities depend on cross-community connectivity, not just holding a formal title.",
        caveat:
          "The study is cross-sectional, single-site and based on governance participants rather than all students. Network position, civic attitudes and participation can influence one another, while classifier performance does not establish causal effects or justify ranking individuals for opportunities.",
        tags: ["Student governance", "Civic participation", "Network prediction"],
      },
      "zh-hant": {
        title: "學生自治網絡位置與公民參與結果",
        imageAlt:
          "真人照片呈現大型大學治理論壇圍繞中央圓桌進行，參與者舉手並疊加六個社群節點",
        summary:
          "研究在中國東部一所地區大學分析237名學生自治參與者，建立含1,738條連結及六個功能社群的網絡。特徵向量中心性與社群E-I指數預測公民結果，XGBoost以0.781準確率及0.842 AUC分類參與。",
        actors: "中國東部一所地區大學參與正式學生自治組織的237名學生",
        relations: "涵蓋資訊交換、決策協調及跨單位協作的1,738段自陳自治連結",
        analysis:
          "作者描述密度、社群、中心性、中介及E-I混合，配適控制人口特徵的多變量迴歸，並以網絡特徵比較邏輯迴歸、支持向量、隨機森林及XGBoost分類器。",
        finding:
          "網絡密度為0.062，包含六個社群及階層樞紐輻射結構；中央學生政府橋接外圍群體，而XGBoost達0.781準確率及0.842 AUC。",
        value:
          "研究呈現學生自治內不均等的結構渠道，並指出公民發展機會取決於跨社群連接，而不只是擁有正式職銜。",
        caveat:
          "研究屬橫斷面、單一場地，對象是自治參與者而非全體學生。網絡位置、公民態度及參與可互相影響，分類表現也不能建立因果效果或合理化按個人排名分配機會。",
        tags: ["學生自治", "公民參與", "網絡預測"],
      },
      "zh-hans": {
        title: "学生自治网络位置与公民参与结果",
        imageAlt:
          "真人照片呈现大型大学治理论坛围绕中央圆桌进行，参与者举手并叠加六个社群节点",
        summary:
          "研究在中国东部一所地区大学分析237名学生自治参与者，建立含1,738条连接及六个功能社群的网络。特征向量中心性与社群E-I指数预测公民结果，XGBoost以0.781准确率及0.842 AUC分类参与。",
        actors: "中国东部一所地区大学参与正式学生自治组织的237名学生",
        relations: "涵盖信息交换、决策协调及跨单位协作的1,738段自报自治连接",
        analysis:
          "作者描述密度、社群、中心性、中介及E-I混合，拟合控制人口特征的多变量回归，并用网络特征比较逻辑回归、支持向量、随机森林及XGBoost分类器。",
        finding:
          "网络密度为0.062，包含六个社群及层级枢纽辐射结构；中央学生政府桥接外围群体，而XGBoost达到0.781准确率及0.842 AUC。",
        value:
          "研究呈现学生自治内不均等的结构渠道，并指出公民发展机会取决于跨社群连接，而不只是拥有正式职称。",
        caveat:
          "研究属于横断面、单一场地，对象是自治参与者而非全体学生。网络位置、公民态度及参与可互相影响，分类表现也不能建立因果效果或合理化按个人排名分配机会。",
        tags: ["学生自治", "公民参与", "网络预测"],
      },
    },
  },
];

export const backfillNewsArticles: NewsArticleRecord[] = papers.map(createArticle);
