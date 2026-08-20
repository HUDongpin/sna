import type {
  AcademyLessonLocalization,
  AcademyLessonRecord,
} from "@/lib/academy-types";

type Language = "en" | "zh-hant" | "zh-hans";

type LessonText = {
  title: string;
  shortSummary: string;
  concept: string;
  visualLabel: string;
  scenario: string;
  nodes: string;
  ties: string;
  networkType: string;
  procedure: string;
  warning: string;
  tags: [string, string, string];
  relatedConcepts: [string, string, string];
};

type BackfillLesson = Omit<AcademyLessonRecord, "localizations"> & {
  text: Record<Language, LessonText>;
};

function createLocalization(
  text: LessonText,
  language: Language,
): AcademyLessonLocalization {
  if (language === "en") {
    return {
      title: text.title,
      shortSummary: text.shortSummary,
      tags: text.tags,
      visualLabel: text.visualLabel,
      learningObjectives: [
        "Define " + text.concept + " from an explicit node, tie, boundary, direction, weight, and observation-window specification.",
        "Apply and audit this procedure: " + text.procedure,
        "Interpret the result with a sensitivity check and the following evidence boundary: " + text.warning,
      ],
      scenario: text.scenario,
      nodes: text.nodes,
      ties: text.ties,
      networkType: text.networkType,
      tutorialSteps: [
        {
          title: "Freeze the relational question",
          action:
            "Write the decision the analysis must inform, then lock the eligible node roster, tie-generating event, direction, weight, self-tie rule, observation window, and missing-data code. Preserve a read-only source copy and record why this specification represents the stated question.",
          checkpoint:
            "A second analyst can reconstruct the same node set and edge table from the written rules without guessing what an absent record means.",
        },
        {
          title: "Compute the focal structure",
          action:
            "Work on a versioned analysis copy and carry out the focal method exactly as specified: " +
            text.procedure +
            " Save software and package versions, every threshold, normalization, seed, and intermediate count needed to reproduce the result.",
          checkpoint:
            "The output is tied to one named data version and includes the denominator, parameter settings, and a reproducible calculation record.",
        },
        {
          title: "Run a structural sensitivity check",
          action:
            "Repeat the analysis under at least one defensible alternative boundary, missingness rule, tie threshold, weight transformation, or model setting. Compare membership and substantive conclusions, not only a single coefficient, and investigate every change large enough to alter a decision.",
          checkpoint:
            "The audit states which patterns persist, which actors or groups change classification, and which conclusion depends on an analyst choice.",
        },
        {
          title: "Report for responsible action",
          action:
            "Pair the numerical result with a table or structure-preserving visual, document excluded and missing actors, and explain uncertainty in plain language. Convert the finding into a reversible support question, not an automatic ranking, while stating this boundary: " +
            text.warning,
          checkpoint:
            "The final note contains the question, specification, result, sensitivity evidence, uncertainty, privacy controls, and a proportionate next step.",
        },
      ],
      interpretation: [
        text.concept +
          " describes a property of the specified relation and network boundary. It does not transfer automatically to another relation, time period, class, platform, or population.",
        text.warning +
          " Compare the result with raw counts, missingness, plausible alternative specifications, and contextual evidence before acting.",
      ],
      coreIdeas: [
        "A defensible network result begins with a relational question and an auditable graph specification.",
        text.procedure,
        "Sensitivity, uncertainty, privacy, and causal restraint are part of the analysis rather than optional reporting extras.",
      ],
      practiceTask:
        "Create a small edge list consistent with this scenario: " +
        text.scenario +
        " Apply " +
        text.concept +
        ", repeat it under one defensible alternative, and write a 120-word decision note that distinguishes the stable result from the choice-sensitive result.",
      responsibleUse:
        "Minimize identifiable relational data, restrict access to raw node and edge tables, and do not expose named isolates, bridges, or subgroup memberships in routine dashboards. Invite contextual review from affected participants before intervention, use network evidence to offer support rather than punish or rank, and retain this limit: " +
        text.warning,
      relatedConcepts: text.relatedConcepts,
    };
  }

  if (language === "zh-hant") {
    return {
      title: text.title,
      shortSummary: text.shortSummary,
      tags: text.tags,
      visualLabel: text.visualLabel,
      learningObjectives: [
        "從明確的節點、連結、邊界、方向、權重及觀察時間窗規格界定" + text.concept + "。",
        "執行並審核以下程序：" + text.procedure,
        "以敏感度檢查及下列證據邊界詮釋結果：" + text.warning,
      ],
      scenario: text.scenario,
      nodes: text.nodes,
      ties: text.ties,
      networkType: text.networkType,
      tutorialSteps: [
        {
          title: "固定關係問題",
          action:
            "寫出分析需要支援的決定，然後鎖定合資格節點名冊、產生連結的事件、方向、權重、自我連結規則、觀察時間窗及缺失資料編碼。保留唯讀來源副本，並記錄此規格為何代表所述問題。",
          checkpoint:
            "第二位分析者可只按書面規則重建相同節點集合及邊列表，無需猜測缺少紀錄代表甚麼。",
        },
        {
          title: "計算焦點結構",
          action:
            "在有版本的分析副本上，嚴格按規格執行焦點方法：" +
            text.procedure +
            "保存軟件與套件版本、所有門檻、標準化、種子及重現結果所需的中間計數。",
          checkpoint:
            "輸出連結至一個具名資料版本，並包含分母、參數設定及可重現的計算紀錄。",
        },
        {
          title: "進行結構敏感度檢查",
          action:
            "在至少一項可辯護的替代邊界、缺失規則、連結門檻、權重轉換或模型設定下重複分析。比較成員身分及實質結論，而非只看單一係數，並調查足以改變決定的差異。",
          checkpoint:
            "審核說明哪些模式保持、哪些行動者或群體改變分類，以及哪項結論依賴分析者選擇。",
        },
        {
          title: "為負責任行動作報告",
          action:
            "把數值結果與表格或保留結構的圖像配對，記錄被排除及缺失的行動者，以清楚語言解釋不確定性。把發現轉化為可逆的支援問題而非自動排名，並說明此邊界：" +
            text.warning,
          checkpoint:
            "最終說明包含問題、規格、結果、敏感度證據、不確定性、私隱控制及合比例下一步。",
        },
      ],
      interpretation: [
        text.concept +
          "描述指定關係及網絡邊界的性質，不能自動轉移至另一關係、時段、班別、平台或群體。",
        text.warning + "採取行動前，應把結果與原始計數、缺失情況、合理替代規格及情境證據比較。",
      ],
      coreIdeas: [
        "可辯護網絡結果由關係問題及可審核圖規格開始。",
        text.procedure,
        "敏感度、不確定性、私隱及因果克制是分析一部分，而非可選報告附件。",
      ],
      practiceTask:
        "按此情境建立小型邊列表：" +
        text.scenario +
        "應用" +
        text.concept +
        "，再以一項可辯護替代設定重複，並撰寫120字決策說明，區分穩定結果與受選擇影響的結果。",
      responsibleUse:
        "減少可識別關係資料，限制原始節點表及邊列表存取，不可在日常儀表板公開具名孤立者、中介或小組成員身分。介入前應邀請受影響參與者作情境審閱，以網絡證據提供支援而非懲罰或排名，並保留此限制：" +
        text.warning,
      relatedConcepts: text.relatedConcepts,
    };
  }

  return {
    title: text.title,
    shortSummary: text.shortSummary,
    tags: text.tags,
    visualLabel: text.visualLabel,
    learningObjectives: [
      "从明确的节点、连接、边界、方向、权重及观察时间窗规格界定" + text.concept + "。",
      "执行并审核以下程序：" + text.procedure,
      "用敏感度检查及下列证据边界解释结果：" + text.warning,
    ],
    scenario: text.scenario,
    nodes: text.nodes,
    ties: text.ties,
    networkType: text.networkType,
    tutorialSteps: [
      {
        title: "固定关系问题",
        action:
          "写出分析需要支持的决定，然后锁定符合条件节点名册、产生连接的事件、方向、权重、自连接规则、观察时间窗及缺失数据编码。保留只读来源副本，并记录此规格为何代表所述问题。",
        checkpoint:
          "第二位分析者可只按书面规则重建相同节点集合及边列表，无需猜测缺少记录代表什么。",
      },
      {
        title: "计算焦点结构",
        action:
          "在有版本的分析副本上，严格按规格执行焦点方法：" +
          text.procedure +
          "保存软件与包版本、所有阈值、标准化、种子及复现结果所需的中间计数。",
        checkpoint:
          "输出连接到一个具名数据版本，并包含分母、参数设置及可复现的计算记录。",
      },
      {
        title: "进行结构敏感度检查",
        action:
          "在至少一项可辩护的替代边界、缺失规则、连接阈值、权重转换或模型设置下重复分析。比较成员身份及实质结论，而不是只看单一系数，并调查足以改变决定的差异。",
        checkpoint:
          "审核说明哪些模式保持、哪些行动者或群体改变分类，以及哪项结论依赖分析者选择。",
      },
      {
        title: "为负责任行动作报告",
        action:
          "把数值结果与表格或保留结构的图像配对，记录被排除及缺失的行动者，用清楚语言解释不确定性。把发现转化为可逆的支持问题而非自动排名，并说明此边界：" +
          text.warning,
        checkpoint:
          "最终说明包含问题、规格、结果、敏感度证据、不确定性、隐私控制及适度下一步。",
      },
    ],
    interpretation: [
      text.concept +
        "描述指定关系及网络边界的性质，不能自动转移到另一关系、时段、班级、平台或群体。",
      text.warning + "采取行动前，应把结果与原始计数、缺失情况、合理替代规格及情境证据比较。",
    ],
    coreIdeas: [
      "可辩护网络结果从关系问题及可审核图规格开始。",
      text.procedure,
      "敏感度、不确定性、隐私及因果克制是分析一部分，而非可选报告附件。",
    ],
    practiceTask:
      "按此情境建立小型边列表：" +
      text.scenario +
      "应用" +
      text.concept +
      "，再用一项可辩护替代设置重复，并撰写120字决策说明，区分稳定结果与受选择影响的结果。",
    responsibleUse:
      "减少可识别关系数据，限制原始节点表及边列表访问，不可在日常仪表板公开具名孤立者、中介或小组成员身份。干预前应邀请受影响参与者作情境审核，用网络证据提供支持而非惩罚或排名，并保留此限制：" +
      text.warning,
    relatedConcepts: text.relatedConcepts,
  };
}

function createLesson(lesson: BackfillLesson): AcademyLessonRecord {
  const { text, ...metadata } = lesson;
  return {
    ...metadata,
    localizations: {
      en: createLocalization(text.en, "en"),
      "zh-hant": createLocalization(text["zh-hant"], "zh-hant"),
      "zh-hans": createLocalization(text["zh-hans"], "zh-hans"),
    },
  };
}

const lessons: BackfillLesson[] = [
  {
    id: "academy-012",
    sequence: 12,
    slug: "distinguish-degree-and-weighted-strength",
    track: "network-theory",
    level: "foundation",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-07-23",
    reviewedAt: "2026-07-23",
    durationMinutes: 12,
    sources: [
      {
        label: "Opsahl et al.: Node centrality in weighted networks",
        url: "https://doi.org/10.1016/j.socnet.2010.03.006",
      },
      {
        label: "Barrat et al.: Architecture of complex weighted networks",
        url: "https://doi.org/10.1073/pnas.0400087101",
      },
    ],
    text: {
      en: {
        title: "Distinguish Degree from Weighted Strength",
        shortSummary:
          "Separate the number of partners from the volume or intensity of interaction, then test whether a weighted conclusion survives defensible transformations.",
        concept: "degree and weighted strength",
        visualLabel: "Partners versus interaction volume",
        scenario:
          "A seminar coordinator wants to compare students who exchange project advice with many classmates against students who repeatedly consult a smaller set of partners during six weeks.",
        nodes: "All enrolled seminar students on the frozen six-week roster, including students with zero recorded advice exchanges.",
        ties: "A directed advice event from the student seeking help to the classmate who responded, weighted by the number of qualifying exchanges.",
        networkType:
          "One-mode, directed, weighted whole network with retained isolates, no self-ties, a six-week window, and missing observers coded as unknown.",
        procedure:
          "Calculate in-degree and out-degree from the binary edge table, calculate incoming and outgoing strength from event weights, inspect their joint distribution, and repeat after capping extreme weights.",
        warning:
          "More partners and more recorded exchanges are different constructs; neither measure establishes advice quality, learning, influence, or causal benefit.",
        tags: ["degree", "weighted strength", "centrality"],
        relatedConcepts: ["edge weight", "in-degree", "sensitivity analysis"],
      },
      "zh-hant": {
        title: "區分度數與加權強度",
        shortSummary: "把伙伴數目與互動量或強度分開，再檢查加權結論能否在可辯護轉換下保持。",
        concept: "度數與加權強度",
        visualLabel: "伙伴數目對互動量",
        scenario: "研討課統籌員希望比較向許多同學交換項目建議的學生，以及在六週內反覆諮詢較少伙伴的學生。",
        nodes: "固定六週名冊內全部研討課學生，包括沒有已記錄建議交換的學生。",
        ties: "由尋求協助的學生指向作出回應同學的建議事件，按合資格交換次數加權。",
        networkType: "單模式、有向、加權完整網絡，保留孤立節點、沒有自我連結、六週時間窗，並把缺失觀察者標記為未知。",
        procedure: "由二元邊列表計算入度及出度，由事件權重計算入向及出向強度，檢視兩者聯合分布，再於限制極端權重後重複。",
        warning: "更多伙伴與更多已記錄交換是不同構念；兩者均不能確立建議品質、學習、影響力或因果益處。",
        tags: ["度數", "加權強度", "中心性"],
        relatedConcepts: ["邊權重", "入度", "敏感度分析"],
      },
      "zh-hans": {
        title: "区分度数与加权强度",
        shortSummary: "把伙伴数目与互动量或强度分开，再检查加权结论能否在可辩护转换下保持。",
        concept: "度数与加权强度",
        visualLabel: "伙伴数目对互动量",
        scenario: "研讨课协调员希望比较向许多同学交换项目建议的学生，以及在六周内反复咨询较少伙伴的学生。",
        nodes: "固定六周名册内全部研讨课学生，包括没有已记录建议交换的学生。",
        ties: "由寻求帮助的学生指向作出回应同学的建议事件，按符合条件交换次数加权。",
        networkType: "单模式、有向、加权完整网络，保留孤立节点、没有自连接、六周时间窗，并把缺失观察者标记为未知。",
        procedure: "由二元边列表计算入度及出度，由事件权重计算入向及出向强度，检视两者联合分布，再在限制极端权重后重复。",
        warning: "更多伙伴与更多已记录交换是不同构念；两者均不能确立建议质量、学习、影响力或因果益处。",
        tags: ["度数", "加权强度", "中心性"],
        relatedConcepts: ["边权重", "入度", "敏感度分析"],
      },
    },
  },
  {
    id: "academy-013",
    sequence: 13,
    slug: "design-and-interpret-ego-networks",
    track: "responsible-application",
    level: "applied",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-07-24",
    reviewedAt: "2026-07-24",
    durationMinutes: 14,
    sources: [
      {
        label: "Perry et al.: Egocentric Network Analysis",
        url: "https://doi.org/10.1017/9781316443255",
      },
      {
        label: "McCarty et al.: Structure in personal networks",
        url: "https://doi.org/10.1016/j.socnet.2018.12.005",
      },
    ],
    text: {
      en: {
        title: "Design and Interpret Ego Networks",
        shortSummary:
          "Build a personal network around a focal actor, document the name generator and alter boundary, and interpret composition without pretending to observe the whole system.",
        concept: "ego-network composition and structure",
        visualLabel: "Focal learner and named alters",
        scenario:
          "A clerkship team asks how new medical students assemble emotional, informational, and clinical support during their first four months.",
        nodes: "Each consenting focal student and the people that student names through the pre-specified support prompts.",
        ties: "Focal-student-to-alter support nominations plus alter-alter familiarity reports when the student can answer them.",
        networkType:
          "Multiple directed ego networks with typed support ties, bounded name generators, optional perceived alter-alter ties, and no claim of a complete hospital network.",
        procedure:
          "Audit name-generator wording and nomination limits, calculate alter composition and ego degree, summarize perceived alter-alter density, and compare patterns only after checking opportunity and recall differences.",
        warning:
          "An ego network is the focal participant's reported relational environment, not a census of the organization or an objective rating of every named person.",
        tags: ["ego networks", "personal support", "name generators"],
        relatedConcepts: ["alters", "composition", "network elicitation"],
      },
      "zh-hant": {
        title: "設計及詮釋自我中心網絡",
        shortSummary: "圍繞焦點行動者建立個人網絡，記錄姓名引導題及他者邊界，並在不假裝觀察整個系統下詮釋組成。",
        concept: "自我中心網絡組成及結構",
        visualLabel: "焦點學習者與獲提名他者",
        scenario: "臨床實習團隊想了解新醫學生在首四個月如何組合情緒、資訊及臨床支援。",
        nodes: "每名同意參與的焦點學生，以及該學生透過預先指定支援提示所提名的人。",
        ties: "焦點學生指向他者的支援提名，以及學生能回答時所報告的他者之間熟悉關係。",
        networkType: "多個有向自我中心網絡，包含分類支援連結、有上限的姓名引導題及可選感知他者連結，不聲稱為完整醫院網絡。",
        procedure: "審核姓名引導題字眼及提名上限，計算他者組成與焦點度數，總結感知他者密度，並只在檢查接觸機會與回憶差異後比較模式。",
        warning: "自我中心網絡是焦點參與者報告的關係環境，不是機構普查，也不是對每名獲提名者的客觀評級。",
        tags: ["自我中心網絡", "個人支援", "姓名引導題"],
        relatedConcepts: ["他者", "網絡組成", "網絡引出"],
      },
      "zh-hans": {
        title: "设计及解释自我中心网络",
        shortSummary: "围绕焦点行动者建立个人网络，记录姓名引导题及他者边界，并在不假装观察整个系统下解释组成。",
        concept: "自我中心网络组成及结构",
        visualLabel: "焦点学习者与获提名他者",
        scenario: "临床实习团队想了解新医学生在首四个月如何组合情绪、信息及临床支持。",
        nodes: "每名同意参与的焦点学生，以及该学生通过预先指定支持提示所提名的人。",
        ties: "焦点学生指向他者的支持提名，以及学生能回答时所报告的他者之间熟悉关系。",
        networkType: "多个有向自我中心网络，包含分类支持连接、有上限的姓名引导题及可选感知他者连接，不声称为完整医院网络。",
        procedure: "审核姓名引导题字眼及提名上限，计算他者组成与焦点度数，总结感知他者密度，并只在检查接触机会与回忆差异后比较模式。",
        warning: "自我中心网络是焦点参与者报告的关系环境，不是机构普查，也不是对每名获提名者的客观评级。",
        tags: ["自我中心网络", "个人支持", "姓名引导题"],
        relatedConcepts: ["他者", "网络组成", "网络引出"],
      },
    },
  },
  {
    id: "academy-014",
    sequence: 14,
    slug: "choose-directed-or-undirected-ties",
    track: "network-theory",
    level: "foundation",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-07-25",
    reviewedAt: "2026-07-25",
    durationMinutes: 11,
    sources: [
      {
        label: "Wasserman and Faust: Social Network Analysis",
        url: "https://doi.org/10.1017/CBO9780511815478",
      },
      {
        label: "Newman: Networks, second edition",
        url: "https://doi.org/10.1093/oso/9780198805090.001.0001",
      },
    ],
    text: {
      en: {
        title: "Choose Directed or Undirected Ties",
        shortSummary:
          "Match edge direction to the relation instead of discarding who initiated, nominated, sought, or received an interaction.",
        concept: "edge direction and reciprocity",
        visualLabel: "Who sends and who receives",
        scenario:
          "A school wants to map who seeks teaching advice from whom and must decide whether mutual-looking pairs should be collapsed into undirected connections.",
        nodes: "All teachers employed at the school on the census date, including eligible nonrespondents and isolates.",
        ties: "A directed nomination from teacher A to teacher B when A sought substantive teaching advice from B during the term.",
        networkType:
          "One-mode, directed, binary whole network with no self-ties, one term-long window, and explicit unknown values for nonrespondents.",
        procedure:
          "Preserve the ordered sender-receiver pair, calculate in-degree, out-degree and reciprocity, then compare with an undirected symmetrization using both union and intersection rules.",
        warning:
          "Symmetrizing can erase status, access, initiative, and nonreciprocity; direction indicates the recorded relation, not authority, trust, or quality by itself.",
        tags: ["directed ties", "reciprocity", "symmetrization"],
        relatedConcepts: ["in-degree", "out-degree", "asymmetry"],
      },
      "zh-hant": {
        title: "選擇有向或無向連結",
        shortSummary: "讓邊方向配合關係，不可丟棄誰發起、提名、尋求或接收互動的資訊。",
        concept: "邊方向與互惠",
        visualLabel: "誰發出及誰接收",
        scenario: "一所學校希望繪出誰向誰尋求教學建議，並要決定看似互相的配對是否應合併為無向連結。",
        nodes: "普查日期受僱於學校的全部教師，包括合資格未回應者及孤立節點。",
        ties: "若教師A在學期內向教師B尋求實質教學建議，便建立一條由A指向B的提名。",
        networkType: "單模式、有向、二元完整網絡，沒有自我連結、一個學期時間窗，並為未回應者明確保留未知值。",
        procedure: "保留有次序的發送者與接收者配對，計算入度、出度及互惠，再分別用聯集與交集規則和無向對稱化版本比較。",
        warning: "對稱化可抹去地位、渠道、主動性及不互惠；方向只表示已記錄關係，本身不等於權威、信任或品質。",
        tags: ["有向連結", "互惠", "對稱化"],
        relatedConcepts: ["入度", "出度", "不對稱"],
      },
      "zh-hans": {
        title: "选择有向或无向连接",
        shortSummary: "让边方向配合关系，不可丢弃谁发起、提名、寻求或接收互动的信息。",
        concept: "边方向与互惠",
        visualLabel: "谁发出及谁接收",
        scenario: "一所学校希望绘出谁向谁寻求教学建议，并要决定看似互相的配对是否应合并为无向连接。",
        nodes: "普查日期受雇于学校的全部教师，包括符合条件未回应者及孤立节点。",
        ties: "如果教师A在学期内向教师B寻求实质教学建议，便建立一条由A指向B的提名。",
        networkType: "单模式、有向、二元完整网络，没有自连接、一个学期时间窗，并为未回应者明确保留未知值。",
        procedure: "保留有次序的发送者与接收者配对，计算入度、出度及互惠，再分别用并集与交集规则和无向对称化版本比较。",
        warning: "对称化可抹去地位、渠道、主动性及不互惠；方向只表示已记录关系，本身不等于权威、信任或质量。",
        tags: ["有向连接", "互惠", "对称化"],
        relatedConcepts: ["入度", "出度", "不对称"],
      },
    },
  },
  {
    id: "academy-015",
    sequence: 15,
    slug: "measure-homophily-with-mixing-matrices",
    track: "responsible-application",
    level: "applied",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-07-26",
    reviewedAt: "2026-07-26",
    durationMinutes: 15,
    sources: [
      {
        label: "McPherson et al.: Birds of a feather",
        url: "https://doi.org/10.1146/annurev.soc.27.1.415",
      },
      {
        label: "Newman: Mixing patterns in networks",
        url: "https://doi.org/10.1103/PhysRevE.67.026126",
      },
    ],
    text: {
      en: {
        title: "Measure Homophily with Mixing Matrices",
        shortSummary:
          "Compare observed within-group and between-group ties with available opportunities instead of equating raw same-group counts with preference.",
        concept: "categorical homophily and mixing matrices",
        visualLabel: "Observed mixing versus opportunity",
        scenario:
          "A multilingual school asks whether friendship networks cross language groups, but the groups differ greatly in size and timetable overlap.",
        nodes: "All consenting students in the participating year group with language group and timetable opportunity recorded as attributes.",
        ties: "An undirected friendship nomination retained when either student reports the relationship, with reciprocity stored separately.",
        networkType:
          "One-mode, undirected, binary whole network with categorical language attributes, unequal group sizes, retained isolates, and one survey wave.",
        procedure:
          "Build a group-by-group edge mixing matrix, convert counts to proportions, compare observed same-group ties with composition and opportunity baselines, and report uncertainty for small cells.",
        warning:
          "Same-group concentration can arise from group size, schedules, residence, boundary rules, or missing data and must not be presented as prejudice or free preference without stronger evidence.",
        tags: ["homophily", "mixing matrix", "group opportunity"],
        relatedConcepts: ["assortativity", "composition", "confounding"],
      },
      "zh-hant": {
        title: "以混合矩陣量度同質性",
        shortSummary: "把觀察所得組內與組間連結和可用機會比較，不可把原始同組計數直接等同偏好。",
        concept: "類別同質性與混合矩陣",
        visualLabel: "觀察混合對接觸機會",
        scenario: "一所多語學校想知道友誼網絡有否跨越語言小組，但各組規模及課表重疊差異很大。",
        nodes: "參與年級全部同意參與的學生，並把語言小組及課表接觸機會記錄為屬性。",
        ties: "若任一學生報告友誼便保留的無向提名，互惠情況另行儲存。",
        networkType: "單模式、無向、二元完整網絡，包含類別語言屬性、不等組別規模、保留孤立節點及一波問卷。",
        procedure: "建立組別對組別的邊混合矩陣，把計數轉為比例，比較觀察所得同組連結與組成及機會基線，並為細小儲存格報告不確定性。",
        warning: "同組集中可由組別規模、課表、居住、邊界規則或缺失資料造成；沒有更強證據時，不可描述為偏見或自由偏好。",
        tags: ["同質性", "混合矩陣", "組別機會"],
        relatedConcepts: ["同配性", "組成", "混淆"],
      },
      "zh-hans": {
        title: "用混合矩阵测量同质性",
        shortSummary: "把观察到的组内与组间连接和可用机会比较，不可把原始同组计数直接等同偏好。",
        concept: "类别同质性与混合矩阵",
        visualLabel: "观察混合对接触机会",
        scenario: "一所多语学校想知道友谊网络是否跨越语言小组，但各组规模及课表重叠差异很大。",
        nodes: "参与年级全部同意参与的学生，并把语言小组及课表接触机会记录为属性。",
        ties: "如果任一学生报告友谊便保留的无向提名，互惠情况另行存储。",
        networkType: "单模式、无向、二元完整网络，包含类别语言属性、不等组别规模、保留孤立节点及一波问卷。",
        procedure: "建立组别对组别的边混合矩阵，把计数转为比例，比较观察到的同组连接与组成及机会基线，并为细小单元格报告不确定性。",
        warning: "同组集中可由组别规模、课表、居住、边界规则或缺失数据造成；没有更强证据时，不可描述为偏见或自由偏好。",
        tags: ["同质性", "混合矩阵", "组别机会"],
        relatedConcepts: ["同配性", "组成", "混淆"],
      },
    },
  },
  {
    id: "academy-016",
    sequence: 16,
    slug: "compare-assortativity-and-ei-index",
    track: "network-theory",
    level: "advanced",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-07-27",
    reviewedAt: "2026-07-27",
    durationMinutes: 16,
    sources: [
      {
        label: "Newman: Mixing patterns in networks",
        url: "https://doi.org/10.1103/PhysRevE.67.026126",
      },
      {
        label: "Krackhardt and Stern: Informal networks and organizational crises",
        url: "https://doi.org/10.2307/2786835",
      },
    ],
    text: {
      en: {
        title: "Compare Assortativity and the E-I Index",
        shortSummary:
          "Use two normalized views of group mixing, inspect their denominators, and avoid interpreting either coefficient without the mixing table.",
        concept: "categorical assortativity and the external-internal index",
        visualLabel: "Two normalized mixing summaries",
        scenario:
          "A student-governance review asks whether working relations connect six committees or remain inside them despite sharply unequal committee sizes.",
        nodes: "All eligible office holders across the six governance committees at the review date.",
        ties: "A directed report that one office holder coordinated a substantive governance task with another during the semester.",
        networkType:
          "One-mode, directed, binary whole network with committee as a categorical attribute, no self-ties, and retained nonrespondent status.",
        procedure:
          "Calculate the full directed mixing matrix, categorical assortativity, and group-specific plus overall E-I indices, then compare them with degree-preserving permutations and group-size diagnostics.",
        warning:
          "Assortativity and E-I use different normalizations and can disagree under unequal groups or degree patterns; neither coefficient identifies why boundaries exist.",
        tags: ["assortativity", "E-I index", "boundary crossing"],
        relatedConcepts: ["mixing matrix", "permutation test", "group size"],
      },
      "zh-hant": {
        title: "比較同配性與E-I指數",
        shortSummary: "使用兩種標準化組別混合觀點，檢查各自分母，並避免在沒有混合表下詮釋任何係數。",
        concept: "類別同配性與外部內部指數",
        visualLabel: "兩項標準化混合摘要",
        scenario: "學生自治審核想知道六個委員會的工作關係是否互相連接，還是在規模差異很大的委員會內部維持。",
        nodes: "審核日期六個自治委員會的全部合資格職務持有人。",
        ties: "一名職務持有人報告在學期內與另一人協調實質自治工作的有向連結。",
        networkType: "單模式、有向、二元完整網絡，以委員會作類別屬性、沒有自我連結，並保留未回應狀態。",
        procedure: "計算完整有向混合矩陣、類別同配性、各組及整體E-I指數，再與保持度數的置換及組別規模診斷比較。",
        warning: "同配性與E-I採用不同標準化，在不等組別或度數模式下可以不一致；任何係數均不能識別邊界存在的原因。",
        tags: ["同配性", "E-I指數", "跨越邊界"],
        relatedConcepts: ["混合矩陣", "置換檢驗", "組別規模"],
      },
      "zh-hans": {
        title: "比较同配性与E-I指数",
        shortSummary: "使用两种标准化组别混合观点，检查各自分母，并避免在没有混合表下解释任何系数。",
        concept: "类别同配性与外部内部指数",
        visualLabel: "两项标准化混合摘要",
        scenario: "学生自治审核想知道六个委员会的工作关系是否互相连接，还是在规模差异很大的委员会内部维持。",
        nodes: "审核日期六个自治委员会的全部符合条件职务持有人。",
        ties: "一名职务持有人报告在学期内与另一人协调实质自治工作的有向连接。",
        networkType: "单模式、有向、二元完整网络，以委员会作类别属性、没有自连接，并保留未回应状态。",
        procedure: "计算完整有向混合矩阵、类别同配性、各组及整体E-I指数，再与保持度数的置换及组别规模诊断比较。",
        warning: "同配性与E-I采用不同标准化，在不等组别或度数模式下可以不一致；任何系数均不能识别边界存在的原因。",
        tags: ["同配性", "E-I指数", "跨越边界"],
        relatedConcepts: ["混合矩阵", "置换检验", "组别规模"],
      },
    },
  },
  {
    id: "academy-017",
    sequence: 17,
    slug: "build-bipartite-affiliation-networks",
    track: "network-theory",
    level: "foundation",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-07-28",
    reviewedAt: "2026-07-28",
    durationMinutes: 13,
    sources: [
      {
        label: "Borgatti and Everett: Network analysis of two-mode data",
        url: "https://doi.org/10.1016/S0378-8733(96)00301-2",
      },
      {
        label: "Latapy et al.: Basic notions for bipartite networks",
        url: "https://doi.org/10.1016/j.socnet.2007.04.006",
      },
    ],
    text: {
      en: {
        title: "Build Bipartite Affiliation Networks",
        shortSummary:
          "Keep actors and events as separate node sets so shared participation remains observable before any one-mode projection.",
        concept: "bipartite or two-mode network structure",
        visualLabel: "Students linked to activities",
        scenario:
          "A university wants to understand how students encounter one another through clubs, research teams, and service projects during one academic year.",
        nodes: "Two disjoint sets: all consenting students and all eligible co-curricular activities offered during the year.",
        ties: "A student-to-activity membership link supported by the official participation record for the same academic year.",
        networkType:
          "Undirected, binary bipartite affiliation network with no student-student or activity-activity edges and explicit zero-participation students.",
        procedure:
          "Construct a rectangular student-by-activity incidence matrix, verify row and column totals, calculate degree for both modes, inspect connected components, and visualize the two node types with distinct shapes.",
        warning:
          "Shared activity membership creates opportunity for contact but does not demonstrate friendship, collaboration, equal participation, or influence.",
        tags: ["bipartite networks", "affiliation", "incidence matrix"],
        relatedConcepts: ["two-mode data", "projection", "components"],
      },
      "zh-hant": {
        title: "建立二分隸屬網絡",
        shortSummary: "把行動者及活動保留為兩組不同節點，讓共同參與在任何單模式投影前仍可觀察。",
        concept: "二分或雙模式網絡結構",
        visualLabel: "學生連向活動",
        scenario: "一所大學想了解學生在一個學年內如何透過學會、研究團隊及服務項目相遇。",
        nodes: "兩組互不重疊節點：全部同意參與的學生及學年內全部合資格課外活動。",
        ties: "由同一學年正式參與紀錄支持的學生對活動成員連結。",
        networkType: "無向、二元二分隸屬網絡，沒有學生對學生或活動對活動邊，並明確保留零參與學生。",
        procedure: "建立學生乘活動的長方形隸屬矩陣，核對行列總數，計算兩種模式的度數，檢視連通組成部分，並以不同形狀呈現兩類節點。",
        warning: "共同活動成員身分只建立接觸機會，不能證明友誼、協作、平等參與或影響力。",
        tags: ["二分網絡", "隸屬關係", "隸屬矩陣"],
        relatedConcepts: ["雙模式資料", "投影", "組成部分"],
      },
      "zh-hans": {
        title: "建立二分隶属网络",
        shortSummary: "把行动者及活动保留为两组不同节点，让共同参与在任何单模式投影前仍可观察。",
        concept: "二分或双模式网络结构",
        visualLabel: "学生连向活动",
        scenario: "一所大学想了解学生在一个学年内如何通过社团、研究团队及服务项目相遇。",
        nodes: "两组互不重叠节点：全部同意参与的学生及学年内全部符合条件课外活动。",
        ties: "由同一学年正式参与记录支持的学生对活动成员连接。",
        networkType: "无向、二元二分隶属网络，没有学生对学生或活动对活动边，并明确保留零参与学生。",
        procedure: "建立学生乘活动的长方形隶属矩阵，核对行列总数，计算两种模式的度数，检视连通组成部分，并用不同形状呈现两类节点。",
        warning: "共同活动成员身份只建立接触机会，不能证明友谊、协作、平等参与或影响力。",
        tags: ["二分网络", "隶属关系", "隶属矩阵"],
        relatedConcepts: ["双模式数据", "投影", "组成部分"],
      },
    },
  },
  {
    id: "academy-018",
    sequence: 18,
    slug: "project-two-mode-networks-responsibly",
    track: "methods-visualization",
    level: "applied",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-07-29",
    reviewedAt: "2026-07-29",
    durationMinutes: 16,
    sources: [
      {
        label: "Borgatti and Everett: Network analysis of two-mode data",
        url: "https://doi.org/10.1016/S0378-8733(96)00301-2",
      },
      {
        label: "Neal: The backbone of bipartite projections",
        url: "https://doi.org/10.1016/j.socnet.2014.09.001",
      },
    ],
    text: {
      en: {
        title: "Project Two-Mode Networks Responsibly",
        shortSummary:
          "Convert affiliations to actor connections only after choosing a weighting rule and showing how popular events can dominate the projection.",
        concept: "one-mode projection of bipartite data",
        visualLabel: "Affiliations converted to shared ties",
        scenario:
          "An academic-development office wants a staff collaboration map from attendance at 40 workshops, including several very large orientation events.",
        nodes: "Staff members in the actor projection, derived from a separate bipartite roster of staff and eligible workshops.",
        ties: "A weighted staff-to-staff link based on shared workshop attendance under a documented projection and event-size weighting rule.",
        networkType:
          "Undirected weighted one-mode projection accompanied by its original binary staff-by-workshop bipartite matrix.",
        procedure:
          "Generate raw co-attendance weights, repeat with inverse event-size or another justified weighting, compare density and rankings, and retain the bipartite view beside every projected figure.",
        warning:
          "Projection creates inferred actor ties and dense cliques around popular events; it does not show direct interaction, collaboration quality, or equal exposure.",
        tags: ["network projection", "two-mode data", "edge weighting"],
        relatedConcepts: ["affiliation", "backbone", "co-attendance"],
      },
      "zh-hant": {
        title: "負責任地投影雙模式網絡",
        shortSummary: "只有在選定權重規則並展示大型活動如何主導投影後，才把隸屬關係轉為行動者連結。",
        concept: "二分資料的單模式投影",
        visualLabel: "把隸屬轉為共同連結",
        scenario: "學術發展辦公室想從40場工作坊出席紀錄建立職員協作圖，其中包括數場大型迎新活動。",
        nodes: "行動者投影中的職員，來自分開的職員與合資格工作坊二分名冊。",
        ties: "按有文件記錄的投影及活動規模權重規則，由共同出席工作坊建立的加權職員連結。",
        networkType: "無向加權單模式投影，並連同原始二元職員乘工作坊二分矩陣保存。",
        procedure: "產生原始共同出席權重，再以活動規模倒數或另一可辯護權重重複，比較密度與排名，並在每幅投影圖旁保留二分視圖。",
        warning: "投影會產生推斷行動者連結及由熱門活動形成的密集完全子圖；它不顯示直接互動、協作品質或相等接觸。",
        tags: ["網絡投影", "雙模式資料", "邊權重"],
        relatedConcepts: ["隸屬關係", "骨幹", "共同出席"],
      },
      "zh-hans": {
        title: "负责任地投影双模式网络",
        shortSummary: "只有在选定权重规则并展示大型活动如何主导投影后，才把隶属关系转为行动者连接。",
        concept: "二分数据的单模式投影",
        visualLabel: "把隶属转为共同连接",
        scenario: "学术发展办公室想从40场工作坊出席记录建立职员协作图，其中包括数场大型迎新活动。",
        nodes: "行动者投影中的职员，来自分开的职员与符合条件工作坊二分名册。",
        ties: "按有文档记录的投影及活动规模权重规则，由共同出席工作坊建立的加权职员连接。",
        networkType: "无向加权单模式投影，并连同原始二元职员乘工作坊二分矩阵保存。",
        procedure: "产生原始共同出席权重，再用活动规模倒数或另一可辩护权重重复，比较密度与排名，并在每幅投影图旁保留二分视图。",
        warning: "投影会产生推断行动者连接及由热门活动形成的密集完全子图；它不显示直接互动、协作质量或相等接触。",
        tags: ["网络投影", "双模式数据", "边权重"],
        relatedConcepts: ["隶属关系", "骨干", "共同出席"],
      },
    },
  },
  {
    id: "academy-019",
    sequence: 19,
    slug: "analyze-multiplex-learning-networks",
    track: "network-theory",
    level: "advanced",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-07-30",
    reviewedAt: "2026-07-30",
    durationMinutes: 17,
    sources: [
      {
        label: "Kivela et al.: Multilayer networks",
        url: "https://doi.org/10.1093/comnet/cnu016",
      },
      {
        label: "Boccaletti et al.: Structure and dynamics of multilayer networks",
        url: "https://doi.org/10.1016/j.physrep.2014.07.001",
      },
    ],
    text: {
      en: {
        title: "Analyze Multiplex Learning Networks",
        shortSummary:
          "Keep friendship, advice, collaboration, and information as separate layers before asking where they overlap or compensate.",
        concept: "multiplex and multilayer network structure",
        visualLabel: "Several relations among one roster",
        scenario:
          "A medical program wants to know whether students who lack friendship ties can still access study help, information, or clinical advice.",
        nodes: "One fixed roster of students represented consistently in every relational layer, including isolates in any layer.",
        ties: "Separate directed nominations for friendship, study support, information sharing, collaboration, and clinical advice during one term.",
        networkType:
          "Five-layer directed binary multiplex network with identical node identities, relation-specific missingness, no self-ties, and one observation window.",
        procedure:
          "Audit each layer separately, compare layer density and degree, calculate pairwise edge overlap and actor-level participation profiles, and justify any aggregate multiplex score before use.",
        warning:
          "Layers measure different resources; collapsing them can hide a student who has many friends but no advice access, and overlap does not establish transfer or causality.",
        tags: ["multiplex networks", "relational layers", "overlap"],
        relatedConcepts: ["multilayer network", "edge overlap", "support access"],
      },
      "zh-hant": {
        title: "分析多重學習網絡",
        shortSummary: "先把友誼、建議、協作及資訊保留為不同層，再追問它們在哪裏重疊或互補。",
        concept: "多重及多層網絡結構",
        visualLabel: "同一名冊的多種關係",
        scenario: "醫學課程想知道欠缺友誼連結的學生，是否仍可取得學習協助、資訊或臨床建議。",
        nodes: "在每個關係層一致呈現的一份固定學生名冊，包括任何一層的孤立節點。",
        ties: "一個學期內分別量度的友誼、學習支援、資訊分享、協作及臨床建議有向提名。",
        networkType: "五層有向二元多重網絡，節點身分相同、按關係處理缺失、沒有自我連結及一個觀察時間窗。",
        procedure: "分別審核每一層，比較各層密度與度數，計算兩兩邊重疊及行動者層參與輪廓，並在使用任何多重聚合分數前提出理據。",
        warning: "各層量度不同資源；合併可隱藏朋友很多但沒有建議渠道的學生，而重疊不能確立轉移或因果。",
        tags: ["多重網絡", "關係層", "重疊"],
        relatedConcepts: ["多層網絡", "邊重疊", "支援渠道"],
      },
      "zh-hans": {
        title: "分析多重学习网络",
        shortSummary: "先把友谊、建议、协作及信息保留为不同层，再追问它们在哪里重叠或互补。",
        concept: "多重及多层网络结构",
        visualLabel: "同一名册的多种关系",
        scenario: "医学课程想知道缺少友谊连接的学生，是否仍可获得学习帮助、信息或临床建议。",
        nodes: "在每个关系层一致呈现的一份固定学生名册，包括任何一层的孤立节点。",
        ties: "一个学期内分别测量的友谊、学习支持、信息分享、协作及临床建议有向提名。",
        networkType: "五层有向二元多重网络，节点身份相同、按关系处理缺失、没有自连接及一个观察时间窗。",
        procedure: "分别审核每一层，比较各层密度与度数，计算两两边重叠及行动者层参与轮廓，并在使用任何多重聚合分数前提出依据。",
        warning: "各层测量不同资源；合并可隐藏朋友很多但没有建议渠道的学生，而重叠不能确立转移或因果。",
        tags: ["多重网络", "关系层", "重叠"],
        relatedConcepts: ["多层网络", "边重叠", "支持渠道"],
      },
    },
  },
  {
    id: "academy-020",
    sequence: 20,
    slug: "retain-isolates-and-audit-core-periphery",
    track: "responsible-application",
    level: "foundation",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-07-31",
    reviewedAt: "2026-07-31",
    durationMinutes: 13,
    sources: [
      {
        label: "Borgatti and Everett: Models of core-periphery structures",
        url: "https://doi.org/10.1016/S0378-8733(99)00019-2",
      },
      {
        label: "Smith and Moody: Network sampling coverage",
        url: "https://doi.org/10.1016/j.socnet.2013.03.003",
      },
    ],
    text: {
      en: {
        title: "Retain Isolates and Audit Core-Periphery Claims",
        shortSummary:
          "Keep eligible zero-tie actors in the denominator and distinguish observed isolation from missing participation before fitting a core-periphery pattern.",
        concept: "isolates and core-periphery structure",
        visualLabel: "Visible zero-tie actors and fitted core",
        scenario:
          "A district advice survey appears to show a tightly connected leadership core and several isolated teachers, but six eligible teachers did not return the survey.",
        nodes: "Every teacher on the census-date roster, with response, eligibility, and school attributes retained.",
        ties: "A directed teaching-advice nomination during the previous eight weeks, with nonresponse stored as unknown rather than zero.",
        networkType:
          "One-mode, directed, binary whole network containing observed isolates, partial respondents, and explicit unknown dyads.",
        procedure:
          "Reconcile the roster, display observed isolates, separate no-tie from unknown, fit a stated discrete or continuous core-periphery model, and repeat under plausible missing-edge scenarios.",
        warning:
          "An isolate may reflect boundary, opportunity, nonresponse, or tie definition; core membership is a model-dependent pattern and not a label of competence or worth.",
        tags: ["isolates", "core-periphery", "missing ties"],
        relatedConcepts: ["roster boundary", "nonresponse", "centralization"],
      },
      "zh-hant": {
        title: "保留孤立節點並審核核心外圍主張",
        shortSummary: "在分母保留合資格零連結行動者，並在配適核心外圍模式前區分已觀察孤立與缺失參與。",
        concept: "孤立節點與核心外圍結構",
        visualLabel: "可見零連結行動者及配適核心",
        scenario: "地區建議問卷看似出現緊密領導核心及多名孤立教師，但六名合資格教師沒有交回問卷。",
        nodes: "普查日期名冊內每名教師，保留回應、資格及學校屬性。",
        ties: "過去八週的有向教學建議提名，把未回應儲存為未知而非零。",
        networkType: "單模式、有向、二元完整網絡，包含已觀察孤立節點、部分回應者及明確未知二元關係。",
        procedure: "核對名冊、顯示已觀察孤立節點、區分沒有連結與未知，配適已說明的離散或連續核心外圍模型，再於合理缺失邊情境下重複。",
        warning: "孤立可反映邊界、接觸機會、未回應或連結定義；核心成員身分是模型相關模式，不是能力或價值標籤。",
        tags: ["孤立節點", "核心外圍", "缺失連結"],
        relatedConcepts: ["名冊邊界", "未回應", "集中化"],
      },
      "zh-hans": {
        title: "保留孤立节点并审核核心外围主张",
        shortSummary: "在分母保留符合条件零连接行动者，并在拟合核心外围模式前区分已观察孤立与缺失参与。",
        concept: "孤立节点与核心外围结构",
        visualLabel: "可见零连接行动者及拟合核心",
        scenario: "地区建议问卷看似出现紧密领导核心及多名孤立教师，但六名符合条件教师没有交回问卷。",
        nodes: "普查日期名册内每名教师，保留回应、资格及学校属性。",
        ties: "过去八周的有向教学建议提名，把未回应存储为未知而非零。",
        networkType: "单模式、有向、二元完整网络，包含已观察孤立节点、部分回应者及明确未知二元关系。",
        procedure: "核对名册、显示已观察孤立节点、区分没有连接与未知，拟合已说明的离散或连续核心外围模型，再在合理缺失边情境下重复。",
        warning: "孤立可反映边界、接触机会、未回应或连接定义；核心成员身份是模型相关模式，不是能力或价值标签。",
        tags: ["孤立节点", "核心外围", "缺失连接"],
        relatedConcepts: ["名册边界", "未回应", "集中化"],
      },
    },
  },
  {
    id: "academy-021",
    sequence: 21,
    slug: "design-network-null-models",
    track: "methods-visualization",
    level: "applied",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-01",
    reviewedAt: "2026-08-01",
    durationMinutes: 16,
    sources: [
      {
        label: "Milo et al.: Network motifs and null models",
        url: "https://doi.org/10.1126/science.298.5594.824",
      },
      {
        label: "Maslov and Sneppen: Specificity in topology",
        url: "https://doi.org/10.1126/science.1065103",
      },
    ],
    text: {
      en: {
        title: "Design Network Null Models",
        shortSummary:
          "State what randomization preserves before claiming that a cluster, motif, rich club, or repeated tie occurs more often than expected.",
        concept: "network null models and constrained randomization",
        visualLabel: "Observed graph beside reference graphs",
        scenario:
          "An online course appears to contain an unusually tight active-student core, and the team wants to know whether degree alone explains it.",
        nodes: "All students eligible for the semester discussion network, with the same roster used in observed and simulated graphs.",
        ties: "Directed replies between students, optionally weighted by frequency, with instructor messages excluded under the declared rule.",
        networkType:
          "One-mode directed discussion network paired with an ensemble of randomized reference graphs.",
        procedure:
          "Write the null hypothesis, choose whether to preserve node count, edge count, in-degree, out-degree, weights, reciprocity, or time, generate enough randomized graphs, and locate the observed statistic in the reference distribution.",
        warning:
          "A surprising statistic is relative to one preservation rule; a poorly matched null can manufacture significance and does not reveal a causal mechanism.",
        tags: ["null models", "randomization", "reference distribution"],
        relatedConcepts: ["configuration model", "rich club", "network motifs"],
      },
      "zh-hant": {
        title: "設計網絡虛無模型",
        shortSummary: "在聲稱群集、模體、富俱樂部或重複連結高於預期前，先說明隨機化保留甚麼。",
        concept: "網絡虛無模型與受約束隨機化",
        visualLabel: "觀察圖與參考圖並列",
        scenario: "一門線上課程看似有異常緊密的活躍學生核心，團隊想知道單靠度數能否解釋。",
        nodes: "學期討論網絡的全部合資格學生，觀察圖與模擬圖使用相同名冊。",
        ties: "學生之間的有向回覆，可選擇按頻率加權，並按已聲明規則排除導師訊息。",
        networkType: "單模式有向討論網絡，配上一組隨機參考圖。",
        procedure: "寫出虛無假設，選擇保留節點數、邊數、入度、出度、權重、互惠或時間，產生足夠隨機圖，再把觀察統計放入參考分布。",
        warning: "統計是否異常只相對於一項保留規則；不匹配的虛無模型可製造顯著，也不能揭示因果機制。",
        tags: ["虛無模型", "隨機化", "參考分布"],
        relatedConcepts: ["配置模型", "富俱樂部", "網絡模體"],
      },
      "zh-hans": {
        title: "设计网络零模型",
        shortSummary: "在声称聚类、模体、富俱乐部或重复连接高于预期前，先说明随机化保留什么。",
        concept: "网络零模型与受约束随机化",
        visualLabel: "观察图与参考图并列",
        scenario: "一门在线课程看似有异常紧密的活跃学生核心，团队想知道单靠度数能否解释。",
        nodes: "学期讨论网络的全部符合条件学生，观察图与模拟图使用相同名册。",
        ties: "学生之间的有向回复，可选择按频率加权，并按已声明规则排除导师消息。",
        networkType: "单模式有向讨论网络，配上一组随机参考图。",
        procedure: "写出零假设，选择保留节点数、边数、入度、出度、权重、互惠或时间，产生足够随机图，再把观察统计放入参考分布。",
        warning: "统计是否异常只相对于一项保留规则；不匹配的零模型可制造显著，也不能揭示因果机制。",
        tags: ["零模型", "随机化", "参考分布"],
        relatedConcepts: ["配置模型", "富俱乐部", "网络模体"],
      },
    },
  },
  {
    id: "academy-022",
    sequence: 22,
    slug: "audit-shortest-paths-and-reachability",
    track: "network-theory",
    level: "foundation",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-02",
    reviewedAt: "2026-08-02",
    durationMinutes: 12,
    sources: [
      {
        label: "Newman: Networks, second edition",
        url: "https://doi.org/10.1093/oso/9780198805090.001.0001",
      },
      {
        label: "Freeman: Centrality in social networks",
        url: "https://doi.org/10.1016/0378-8733(78)90021-7",
      },
    ],
    text: {
      en: {
        title: "Audit Shortest Paths and Reachability",
        shortSummary:
          "Calculate distance only among reachable ordered pairs, make disconnected cases visible, and match path direction to the social process.",
        concept: "geodesic distance and reachability",
        visualLabel: "Reachable paths and disconnected pairs",
        scenario:
          "A district wants to estimate how many advice steps separate teachers from curriculum expertise across a directed school network.",
        nodes: "All teachers and curriculum specialists eligible during the same eight-week advice window.",
        ties: "A directed link from a teacher to a person from whom that teacher sought substantive curriculum advice.",
        networkType:
          "One-mode, directed, binary whole network with multiple components, retained isolates, no self-ties, and unknown nonresponse.",
        procedure:
          "Calculate directed shortest paths, enumerate unreachable ordered pairs, report component membership and harmonic rather than ordinary closeness when appropriate, and reverse edge direction only for a separately stated flow question.",
        warning:
          "A short path is a potential structural route under the specified relation, not proof that information traveled, remained accurate, or reached someone quickly.",
        tags: ["shortest paths", "reachability", "components"],
        relatedConcepts: ["harmonic closeness", "direction", "geodesic"],
      },
      "zh-hant": {
        title: "審核最短路徑與可達性",
        shortSummary: "只在可達的有序配對間計算距離，清楚呈現斷開情況，並讓路徑方向配合社會過程。",
        concept: "測地距離與可達性",
        visualLabel: "可達路徑與斷開配對",
        scenario: "一個地區希望估計教師在有向學校網絡中與課程專業知識相隔多少個建議步驟。",
        nodes: "在同一八週建議時間窗內合資格的全部教師及課程專家。",
        ties: "由教師指向其曾尋求實質課程建議之人士的有向連結。",
        networkType: "單模式、有向、二元完整網絡，包含多個組成部分、保留孤立節點、沒有自我連結及未知未回應。",
        procedure: "計算有向最短路徑，列出不可達有序配對，報告組成部分成員，適當時使用調和而非普通接近中心性；只有為另一個已說明流動問題才反轉邊方向。",
        warning: "短路徑只是在指定關係下的潛在結構路線，不能證明資訊確曾傳遞、保持準確或快速到達。",
        tags: ["最短路徑", "可達性", "組成部分"],
        relatedConcepts: ["調和接近中心性", "方向", "測地線"],
      },
      "zh-hans": {
        title: "审核最短路径与可达性",
        shortSummary: "只在可达的有序配对间计算距离，清楚呈现断开情况，并让路径方向配合社会过程。",
        concept: "测地距离与可达性",
        visualLabel: "可达路径与断开配对",
        scenario: "一个地区希望估计教师在有向学校网络中与课程专业知识相隔多少个建议步骤。",
        nodes: "在同一八周建议时间窗内符合条件的全部教师及课程专家。",
        ties: "由教师指向其曾寻求实质课程建议之人士的有向连接。",
        networkType: "单模式、有向、二元完整网络，包含多个组成部分、保留孤立节点、没有自连接及未知未回应。",
        procedure: "计算有向最短路径，列出不可达有序配对，报告组成部分成员，适当时使用调和而非普通接近中心性；只有为另一个已说明流动问题才反转边方向。",
        warning: "短路径只是在指定关系下的潜在结构路线，不能证明信息确曾传递、保持准确或快速到达。",
        tags: ["最短路径", "可达性", "组成部分"],
        relatedConcepts: ["调和接近中心性", "方向", "测地线"],
      },
    },
  },
  {
    id: "academy-023",
    sequence: 23,
    slug: "find-k-core-participation-layers",
    track: "methods-visualization",
    level: "applied",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-03",
    reviewedAt: "2026-08-03",
    durationMinutes: 14,
    sources: [
      {
        label: "Seidman: Network structure and minimum degree",
        url: "https://doi.org/10.1016/0378-8733(83)90028-X",
      },
      {
        label: "Batagelj and Zaversnik: Generalized cores",
        url: "https://arxiv.org/abs/cs/0202039",
      },
    ],
    text: {
      en: {
        title: "Find K-Core Participation Layers",
        shortSummary:
          "Peel a network by minimum internal degree, record coreness, and distinguish a cohesive participation layer from prestige or causal importance.",
        concept: "k-core decomposition and coreness",
        visualLabel: "Nested participation shells",
        scenario:
          "An online learning community wants to identify sustained mutually connected participation without selecting a degree threshold by eye.",
        nodes: "All students eligible for the online course discussion network during the full semester.",
        ties: "An undirected binary connection created when either student directly replied to the other at least twice under the pre-registered threshold.",
        networkType:
          "One-mode, undirected, binary semester network with retained isolates and a documented reply threshold.",
        procedure:
          "Iteratively remove nodes with degree below k, assign each node its highest retained k shell, compare shell membership under alternative reply thresholds, and inspect component structure within the maximum core.",
        warning:
          "High coreness indicates embeddedness under one threshold; it is not identical to leadership, learning quality, rich-club organization, or indispensability.",
        tags: ["k-core", "coreness", "cohesive subgroups"],
        relatedConcepts: ["degree threshold", "nested shells", "rich club"],
      },
      "zh-hant": {
        title: "尋找K核參與層",
        shortSummary: "按最小內部度數逐層剝離網絡，記錄核數，並區分凝聚參與層與聲望或因果重要性。",
        concept: "K核分解與核數",
        visualLabel: "巢狀參與殼層",
        scenario: "一個線上學習社群希望識別持續互相連接的參與，而不以目測選擇度數門檻。",
        nodes: "整個學期線上課程討論網絡的全部合資格學生。",
        ties: "在預先登記門檻下，若任一學生至少兩次直接回覆另一人便建立的無向二元連結。",
        networkType: "單模式、無向、二元學期網絡，保留孤立節點並記錄回覆門檻。",
        procedure: "反覆移除度數低於k的節點，為每個節點指定其可保留的最高k殼層，在替代回覆門檻下比較殼層成員，並檢視最大核內的組成部分結構。",
        warning: "高核數表示在一項門檻下嵌入較深；它不等同領導、學習品質、富俱樂部組織或不可取代性。",
        tags: ["K核", "核數", "凝聚子群"],
        relatedConcepts: ["度數門檻", "巢狀殼層", "富俱樂部"],
      },
      "zh-hans": {
        title: "寻找K核参与层",
        shortSummary: "按最小内部度数逐层剥离网络，记录核数，并区分凝聚参与层与声望或因果重要性。",
        concept: "K核分解与核数",
        visualLabel: "嵌套参与壳层",
        scenario: "一个在线学习社群希望识别持续互相连接的参与，而不用目测选择度数阈值。",
        nodes: "整个学期在线课程讨论网络的全部符合条件学生。",
        ties: "在预先登记阈值下，如果任一学生至少两次直接回复另一人便建立的无向二元连接。",
        networkType: "单模式、无向、二元学期网络，保留孤立节点并记录回复阈值。",
        procedure: "反复移除度数低于k的节点，为每个节点指定其可保留的最高k壳层，在替代回复阈值下比较壳层成员，并检视最大核内的组成部分结构。",
        warning: "高核数表示在一项阈值下嵌入较深；它不等同领导、学习质量、富俱乐部组织或不可替代性。",
        tags: ["K核", "核数", "凝聚子群"],
        relatedConcepts: ["度数阈值", "嵌套壳层", "富俱乐部"],
      },
    },
  },
  {
    id: "academy-024",
    sequence: 24,
    slug: "model-network-evolution-with-saom",
    track: "network-theory",
    level: "advanced",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-04",
    reviewedAt: "2026-08-04",
    durationMinutes: 18,
    sources: [
      {
        label: "Snijders et al.: Introduction to actor-based models",
        url: "https://doi.org/10.1016/j.socnet.2009.02.004",
      },
      {
        label: "Steglich et al.: Dynamic networks and behavior",
        url: "https://doi.org/10.1111/j.1467-9531.2010.01225.x",
      },
    ],
    text: {
      en: {
        title: "Model Network Evolution with SAOM",
        shortSummary:
          "Prepare repeated complete networks, test change capacity and convergence, and interpret selection and influence parameters within an explicit micro-step model.",
        concept: "stochastic actor-oriented models",
        visualLabel: "Tie changes between repeated waves",
        scenario:
          "A school measures friendship and study engagement at four terms and asks whether students select similar peers, become similar after friendship, or both.",
        nodes: "The same eligible student roster reconciled across four survey waves, with entry, exit, and structurally missing periods documented.",
        ties: "Directed friendship nominations at each wave plus a repeatedly measured individual study-engagement behavior.",
        networkType:
          "Longitudinal one-mode directed binary networks with four waves, actor covariates, a changing behavior, no self-ties, and explicit missingness.",
        procedure:
          "Check Jaccard stability and opportunities for change, specify structural, selection and behavior effects before estimation, fit the SAOM, inspect convergence t-ratios and goodness of fit, and compare justified alternative specifications.",
        warning:
          "SAOM parameters are conditional model effects, not direct causal estimates; sparse change, omitted context, period heterogeneity, and misspecification can make selection and influence difficult to separate.",
        tags: ["SAOM", "network evolution", "selection and influence"],
        relatedConcepts: ["longitudinal network", "convergence", "behavior dynamics"],
      },
      "zh-hant": {
        title: "以SAOM建模網絡演變",
        shortSummary: "準備重複完整網絡，檢查改變能力與收斂，並在明確微步模型內詮釋選擇及影響參數。",
        concept: "隨機行動者導向模型",
        visualLabel: "重複波次之間的連結改變",
        scenario: "一所學校在四個學期量度友誼與學習投入，並追問學生是選擇相似同儕、在成為朋友後變得相似，還是兩者兼有。",
        nodes: "跨四波問卷核對的相同合資格學生名冊，並記錄加入、退出及結構性缺失時段。",
        ties: "每波的有向友誼提名，以及重複量度的個人學習投入行為。",
        networkType: "四波縱向單模式有向二元網絡，包含行動者協變量、變動行為、沒有自我連結及明確缺失。",
        procedure: "檢查Jaccard穩定度及改變機會，在估計前指定結構、選擇與行為效果，配適SAOM，檢視收斂t比率及適配度，再比較具理據的替代規格。",
        warning: "SAOM參數是條件模型效果，不是直接因果估計；變化稀少、遺漏情境、時段異質及錯誤規格會令選擇與影響難以分開。",
        tags: ["SAOM", "網絡演變", "選擇與影響"],
        relatedConcepts: ["縱向網絡", "收斂", "行為動態"],
      },
      "zh-hans": {
        title: "用SAOM建模网络演变",
        shortSummary: "准备重复完整网络，检查改变能力与收敛，并在明确微步模型内解释选择及影响参数。",
        concept: "随机行动者导向模型",
        visualLabel: "重复波次之间的连接改变",
        scenario: "一所学校在四个学期测量友谊与学习投入，并追问学生是选择相似同伴、在成为朋友后变得相似，还是两者兼有。",
        nodes: "跨四波问卷核对的相同符合条件学生名册，并记录加入、退出及结构性缺失时段。",
        ties: "每波的有向友谊提名，以及重复测量的个人学习投入行为。",
        networkType: "四波纵向单模式有向二元网络，包含行动者协变量、变动行为、没有自连接及明确缺失。",
        procedure: "检查Jaccard稳定度及改变机会，在估计前指定结构、选择与行为效果，拟合SAOM，检视收敛t比率及拟合度，再比较有依据的替代规格。",
        warning: "SAOM参数是条件模型效果，不是直接因果估计；变化稀少、遗漏情境、时段异质及错误规格会使选择与影响难以分开。",
        tags: ["SAOM", "网络演变", "选择与影响"],
        relatedConcepts: ["纵向网络", "收敛", "行为动态"],
      },
    },
  },
  {
    id: "academy-025",
    sequence: 25,
    slug: "choose-between-ergm-and-saom",
    track: "methods-visualization",
    level: "advanced",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-05",
    reviewedAt: "2026-08-05",
    durationMinutes: 18,
    sources: [
      {
        label: "Robins et al.: ERGM introduction for social networks",
        url: "https://doi.org/10.1016/j.socnet.2006.08.002",
      },
      {
        label: "Snijders et al.: Introduction to actor-based models",
        url: "https://doi.org/10.1016/j.socnet.2009.02.004",
      },
    ],
    text: {
      en: {
        title: "Choose Between ERGM and SAOM",
        shortSummary:
          "Match a cross-sectional dependence question or longitudinal micro-change question to the model whose assumptions and data requirements fit.",
        concept: "ERGM and SAOM model choice",
        visualLabel: "One-wave structure versus network evolution",
        scenario:
          "A research team has one complete advice network from 18 schools and four friendship waves from one school, but initially proposes the same model for both datasets.",
        nodes: "The complete eligible actor roster for each network, harmonized within but not falsely pooled across the separate research settings.",
        ties: "Directed advice ties for each cross-sectional school and directed friendship nominations for each wave of the longitudinal school.",
        networkType:
          "A collection of cross-sectional directed networks plus one four-wave directed longitudinal network, analyzed as distinct designs.",
        procedure:
          "Map each research question to its time structure, use ERGM for conditional cross-sectional tie probabilities and SAOM for modeled between-wave change, check degeneracy or convergence, and compare simulated goodness of fit.",
        warning:
          "ERGM and SAOM answer different conditional questions and rely on different assumptions; similar coefficient names do not make estimates interchangeable or causal.",
        tags: ["ERGM", "SAOM", "model selection"],
        relatedConcepts: ["network dependence", "longitudinal change", "goodness of fit"],
      },
      "zh-hant": {
        title: "在ERGM與SAOM之間作選擇",
        shortSummary: "把橫斷面依賴問題或縱向微改變問題，配對至假設與資料要求合適的模型。",
        concept: "ERGM與SAOM模型選擇",
        visualLabel: "單波結構對網絡演變",
        scenario: "研究團隊有18所學校各一個完整建議網絡，以及一所學校四波友誼網絡，但起初打算為兩種資料使用同一模型。",
        nodes: "每個網絡的完整合資格行動者名冊，在各自設定內協調，但不把不同研究場地錯誤合併。",
        ties: "各橫斷面學校的有向建議連結，以及縱向學校每波的有向友誼提名。",
        networkType: "一組橫斷面有向網絡及一個四波有向縱向網絡，視為不同設計分析。",
        procedure: "把每個研究問題對應其時間結構，以ERGM處理條件橫斷面連結機率，以SAOM處理波次間建模改變，檢查退化或收斂，再比較模擬適配度。",
        warning: "ERGM與SAOM回答不同條件問題並依賴不同假設；相似係數名稱不代表估計可互換或具有因果意義。",
        tags: ["ERGM", "SAOM", "模型選擇"],
        relatedConcepts: ["網絡依賴", "縱向改變", "適配度"],
      },
      "zh-hans": {
        title: "在ERGM与SAOM之间作选择",
        shortSummary: "把横断面依赖问题或纵向微改变问题，配对到假设与数据要求合适的模型。",
        concept: "ERGM与SAOM模型选择",
        visualLabel: "单波结构对网络演变",
        scenario: "研究团队有18所学校各一个完整建议网络，以及一所学校四波友谊网络，但起初打算为两种数据使用同一模型。",
        nodes: "每个网络的完整符合条件行动者名册，在各自设置内协调，但不把不同研究场地错误合并。",
        ties: "各横断面学校的有向建议连接，以及纵向学校每波的有向友谊提名。",
        networkType: "一组横断面有向网络及一个四波有向纵向网络，视为不同设计分析。",
        procedure: "把每个研究问题对应其时间结构，用ERGM处理条件横断面连接概率，用SAOM处理波次间建模改变，检查退化或收敛，再比较模拟拟合度。",
        warning: "ERGM与SAOM回答不同条件问题并依赖不同假设；相似系数名称不代表估计可互换或具有因果意义。",
        tags: ["ERGM", "SAOM", "模型选择"],
        relatedConcepts: ["网络依赖", "纵向改变", "拟合度"],
      },
    },
  },
  {
    id: "academy-026",
    sequence: 26,
    slug: "design-and-evaluate-network-interventions",
    track: "responsible-application",
    level: "applied",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-06",
    reviewedAt: "2026-08-06",
    durationMinutes: 17,
    sources: [
      {
        label: "Valente: Network interventions",
        url: "https://doi.org/10.1126/science.1217330",
      },
      {
        label: "Hunter et al.: Social network interventions",
        url: "https://doi.org/10.1016/j.socnet.2019.06.001",
      },
    ],
    text: {
      en: {
        title: "Design and Evaluate Network Interventions",
        shortSummary:
          "Name the relational mechanism, select a proportionate strategy, pre-specify harms and outcomes, and evaluate change without targeting visible actors by intuition.",
        concept: "network intervention design and evaluation",
        visualLabel: "Mechanism, action, and network outcome",
        scenario:
          "A first-year program wants to improve access to study help without publicly labeling isolated students or overloading already central peer mentors.",
        nodes: "All consenting first-year students in the program, including nonparticipants in optional support events.",
        ties: "A directed report that one student sought substantive study help from another during each four-week window.",
        networkType:
          "Repeated directed binary support networks with a fixed roster, intervention assignment, workload measures, retained isolates, and protected identities.",
        procedure:
          "Specify whether the strategy targets individuals, segments, induced ties, or network alteration, pre-register network and non-network outcomes, use a credible comparison, monitor burden and spillovers, and report intention-to-treat plus missingness.",
        warning:
          "Changing a network can redistribute burden, privacy risk, and exclusion; central actors are not automatically safe or willing intervention agents, and before-after change alone is not causal evidence.",
        tags: ["network intervention", "evaluation", "peer support"],
        relatedConcepts: ["spillover", "randomization", "implementation burden"],
      },
      "zh-hant": {
        title: "設計及評估網絡介入",
        shortSummary: "說明關係機制、選擇合比例策略、預先指定傷害與結果，並在不憑直覺針對顯眼行動者下評估改變。",
        concept: "網絡介入設計與評估",
        visualLabel: "機制、行動及網絡結果",
        scenario: "一年級課程希望改善學習協助渠道，同時不公開標籤孤立學生，也不令原本已居中心的同儕導師過度負荷。",
        nodes: "課程內全部同意參與的一年級學生，包括沒有參加可選支援活動者。",
        ties: "在每個四週時間窗內，一名學生報告曾向另一名學生尋求實質學習協助的有向連結。",
        networkType: "重複有向二元支援網絡，固定名冊、介入分配、工作量量度、保留孤立節點及受保護身分。",
        procedure: "說明策略針對個人、分段、誘發連結還是改變網絡，預先登記網絡及非網絡結果，使用可信比較，監察負擔與溢出，並報告意向治療及缺失情況。",
        warning: "改變網絡可重新分配負擔、私隱風險及排斥；中心行動者不一定是安全或願意的介入代理，而單純前後改變不是因果證據。",
        tags: ["網絡介入", "評估", "同儕支援"],
        relatedConcepts: ["溢出", "隨機化", "執行負擔"],
      },
      "zh-hans": {
        title: "设计及评估网络干预",
        shortSummary: "说明关系机制、选择适度策略、预先指定伤害与结果，并在不凭直觉针对显眼行动者下评估改变。",
        concept: "网络干预设计与评估",
        visualLabel: "机制、行动及网络结果",
        scenario: "一年级课程希望改善学习帮助渠道，同时不公开标记孤立学生，也不使原本已居中心的同伴导师过度负荷。",
        nodes: "课程内全部同意参与的一年级学生，包括没有参加可选支持活动者。",
        ties: "在每个四周时间窗内，一名学生报告曾向另一名学生寻求实质学习帮助的有向连接。",
        networkType: "重复有向二元支持网络，固定名册、干预分配、工作量测量、保留孤立节点及受保护身份。",
        procedure: "说明策略针对个人、分段、诱发连接还是改变网络，预先登记网络及非网络结果，使用可信比较，监测负担与溢出，并报告意向治疗及缺失情况。",
        warning: "改变网络可重新分配负担、隐私风险及排斥；中心行动者不一定是安全或愿意的干预代理，而单纯前后改变不是因果证据。",
        tags: ["网络干预", "评估", "同伴支持"],
        relatedConcepts: ["溢出", "随机化", "执行负担"],
      },
    },
  },
  {
    id: "academy-027",
    sequence: 27,
    slug: "protect-relational-data-privacy",
    track: "responsible-application",
    level: "advanced",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-07",
    reviewedAt: "2026-08-07",
    durationMinutes: 16,
    sources: [
      {
        label: "Borgatti and Molina: Ethical dilemmas in network research",
        url: "https://doi.org/10.1016/j.socnet.2005.11.002",
      },
      {
        label: "Kadushin: Who benefits from network analysis ethics",
        url: "https://doi.org/10.1016/j.socnet.2005.11.005",
      },
    ],
    text: {
      en: {
        title: "Protect Relational Data Privacy",
        shortSummary:
          "Treat every nomination as information about at least two people, minimize disclosure paths, and design governance before collecting a graph.",
        concept: "relational privacy and network-data governance",
        visualLabel: "Protected nodes, ties, and derived positions",
        scenario:
          "A school consortium plans an advice-network dashboard, but a single unusual bridge or isolate could reveal a teacher even after names are removed.",
        nodes: "Eligible staff whose own attributes and structural positions may be disclosed by their ties or by other people's nominations.",
        ties: "Sensitive directed advice nominations that contain information about both nominator and nominee, including people who did not themselves respond.",
        networkType:
          "Identifiable directed whole-network data with high re-identification risk from topology, small groups, attributes, and repeated releases.",
        procedure:
          "Create a data-protection impact map, minimize variables and precision, separate identifiers, encrypt and restrict raw access, define retention and deletion, test structural re-identification, aggregate outputs, and document incident response.",
        warning:
          "Removing names does not anonymize a distinctive graph, and one participant cannot fully consent on behalf of every person exposed through a relational nomination.",
        tags: ["relational privacy", "data governance", "re-identification"],
        relatedConcepts: ["consent", "access control", "data minimization"],
      },
      "zh-hant": {
        title: "保護關係資料私隱",
        shortSummary: "把每個提名視為至少涉及兩人的資料，在收集圖之前減少披露路徑並設計治理。",
        concept: "關係私隱與網絡資料治理",
        visualLabel: "受保護節點、連結及衍生位置",
        scenario: "學校聯盟計劃建立建議網絡儀表板，但單一罕見中介或孤立者即使刪除姓名後仍可揭示教師身分。",
        nodes: "合資格職員，其個人屬性及結構位置可由自己的連結或別人的提名被披露。",
        ties: "敏感有向建議提名，同時包含提名者及被提名者資料，包括自己沒有回應的人。",
        networkType: "可識別有向完整網絡資料，因拓撲、小組、屬性及重複發布而有高重新識別風險。",
        procedure: "建立資料保護影響圖，減少變項與精度，分開識別碼，加密及限制原始存取，界定保留與刪除，測試結構重新識別，聚合輸出並記錄事故回應。",
        warning: "刪除姓名不能令獨特網絡匿名，而一名參與者也不能代表所有因其關係提名而被披露的人完全同意。",
        tags: ["關係私隱", "資料治理", "重新識別"],
        relatedConcepts: ["同意", "存取控制", "資料最少化"],
      },
      "zh-hans": {
        title: "保护关系数据隐私",
        shortSummary: "把每个提名视为至少涉及两人的数据，在收集图之前减少披露路径并设计治理。",
        concept: "关系隐私与网络数据治理",
        visualLabel: "受保护节点、连接及衍生位置",
        scenario: "学校联盟计划建立建议网络仪表板，但单一罕见中介或孤立者即使删除姓名后仍可揭示教师身份。",
        nodes: "符合条件职员，其个人属性及结构位置可由自己的连接或别人的提名被披露。",
        ties: "敏感有向建议提名，同时包含提名者及被提名者数据，包括自己没有回应的人。",
        networkType: "可识别有向完整网络数据，因拓扑、小组、属性及重复发布而有高重新识别风险。",
        procedure: "建立数据保护影响图，减少变量与精度，分开标识码，加密及限制原始访问，界定保留与删除，测试结构重新识别，聚合输出并记录事故回应。",
        warning: "删除姓名不能使独特网络匿名，而一名参与者也不能代表所有因其关系提名而被披露的人完全同意。",
        tags: ["关系隐私", "数据治理", "重新识别"],
        relatedConcepts: ["同意", "访问控制", "数据最少化"],
      },
    },
  },
  {
    id: "academy-028",
    sequence: 28,
    slug: "audit-network-survey-nonresponse",
    track: "responsible-application",
    level: "advanced",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-08",
    reviewedAt: "2026-08-08",
    durationMinutes: 17,
    sources: [
      {
        label: "Kossinets: Effects of missing data in social networks",
        url: "https://doi.org/10.1016/j.socnet.2005.07.002",
      },
      {
        label: "Smith and Moody: Network sampling coverage",
        url: "https://doi.org/10.1016/j.socnet.2013.03.003",
      },
    ],
    text: {
      en: {
        title: "Audit Network Survey Nonresponse",
        shortSummary:
          "Separate unknown dyads from observed zeros, map who is missing, and report how coverage can distort centrality, cohesion, and subgroup comparisons.",
        concept: "network nonresponse and missing-tie sensitivity",
        visualLabel: "Observed, absent, and unknown dyads",
        scenario:
          "A teacher advice survey reaches 72 percent of a district roster, with lower response among temporary staff and one remote school.",
        nodes: "Every eligible district teacher on the roster, carrying response status, school, contract type, and observable opportunity attributes.",
        ties: "Directed advice nominations from respondents, with outgoing ties for nonrespondents unknown and incoming nominations retained when observed.",
        networkType:
          "Partially observed directed whole network with actor-level nonresponse, asymmetric knowledge of dyads, retained roster nodes, and one survey wave.",
        procedure:
          "Build a response-flow table, compare respondents and nonrespondents, mark unknown adjacency cells, calculate coverage by subgroup, bound key metrics under plausible missing ties, and repeat conclusions after inverse-probability or imputation sensitivity when justified.",
        warning:
          "Coding nonresponse as no tie manufactures isolates and can bias density, reciprocity, centrality, communities, and group mixing in unequal ways.",
        tags: ["nonresponse", "missing ties", "coverage"],
        relatedConcepts: ["unknown dyads", "sensitivity bounds", "selection bias"],
      },
      "zh-hant": {
        title: "審核網絡問卷未回應",
        shortSummary: "把未知二元關係與已觀察零分開，繪出誰缺失，並報告涵蓋率如何扭曲中心性、凝聚及分組比較。",
        concept: "網絡未回應與缺失連結敏感度",
        visualLabel: "已觀察、沒有及未知二元關係",
        scenario: "一份教師建議問卷涵蓋地區名冊72%，臨時職員及一所偏遠學校的回應較低。",
        nodes: "名冊內每名合資格地區教師，保留回應狀態、學校、合約類別及可觀察接觸機會屬性。",
        ties: "由回應者作出的有向建議提名，未回應者的外向連結未知，而獲觀察的入向提名仍保留。",
        networkType: "部分觀察有向完整網絡，包含行動者層未回應、不對稱二元關係知識、保留名冊節點及一波問卷。",
        procedure: "建立回應流程表，比較回應與未回應者，標示未知鄰接儲存格，計算各小組涵蓋率，在合理缺失連結下界定主要指標範圍，並在有理據時以逆機率或插補敏感度重複結論。",
        warning: "把未回應編碼為沒有連結會製造孤立節點，並可不均等地偏誤密度、互惠、中心性、社群及組別混合。",
        tags: ["未回應", "缺失連結", "涵蓋率"],
        relatedConcepts: ["未知二元關係", "敏感度界限", "選擇偏差"],
      },
      "zh-hans": {
        title: "审核网络问卷未回应",
        shortSummary: "把未知二元关系与已观察零分开，绘出谁缺失，并报告覆盖率如何扭曲中心性、凝聚及分组比较。",
        concept: "网络未回应与缺失连接敏感度",
        visualLabel: "已观察、没有及未知二元关系",
        scenario: "一份教师建议问卷覆盖地区名册72%，临时职员及一所偏远学校的回应更低。",
        nodes: "名册内每名符合条件地区教师，保留回应状态、学校、合同类别及可观察接触机会属性。",
        ties: "由回应者作出的有向建议提名，未回应者的外向连接未知，而获观察的入向提名仍保留。",
        networkType: "部分观察有向完整网络，包含行动者层未回应、不对称二元关系知识、保留名册节点及一波问卷。",
        procedure: "建立回应流程表，比较回应与未回应者，标记未知邻接单元格，计算各小组覆盖率，在合理缺失连接下界定主要指标范围，并在有依据时用逆概率或插补敏感度重复结论。",
        warning: "把未回应编码为没有连接会制造孤立节点，并可不均等地偏误密度、互惠、中心性、社群及组别混合。",
        tags: ["未回应", "缺失连接", "覆盖率"],
        relatedConcepts: ["未知二元关系", "敏感度界限", "选择偏差"],
      },
    },
  },
  {
    id: "academy-029",
    sequence: 29,
    slug: "validate-behavioral-trace-ties",
    track: "methods-visualization",
    level: "advanced",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-10",
    reviewedAt: "2026-08-10",
    durationMinutes: 18,
    sources: [
      {
        label: "Butts: A relational event framework for social action",
        url: "https://doi.org/10.1111/j.1467-9531.2008.00203.x",
      },
      {
        label: "Howison et al.: Validity issues in SNA with digital trace data",
        url: "https://doi.org/10.17705/1jais.00282",
      },
    ],
    text: {
      en: {
        title: "Validate Behavioral-Trace Ties",
        shortSummary:
          "Turn logs or co-location events into edges only after validating the event, threshold, actor identity, and social meaning against another source.",
        concept: "behavioral-trace network validity",
        visualLabel: "Events converted into defensible ties",
        scenario:
          "A university can access card-swipe co-location and discussion logs and wants to infer peer-support networks without asking students.",
        nodes: "Enrolled students whose identifiers are consistently resolved across the relevant systems and observation period.",
        ties: "Candidate co-location or reply events transformed into directed or undirected edges only under a pre-specified temporal, spatial, and frequency rule.",
        networkType:
          "Event-derived temporal and aggregated networks with uncertain social meaning, repeated observations, system missingness, and privacy-sensitive identifiers.",
        procedure:
          "Audit event generation and identity matching, pre-specify aggregation and thresholds, compare candidate ties with consented survey or interview evidence, estimate precision and recall where possible, and repeat metrics across defensible rules.",
        warning:
          "A digital trace records what a system can see, not necessarily friendship, help, attention, learning, or consent; convenient scale cannot repair construct invalidity.",
        tags: ["behavioral traces", "tie validity", "learning analytics"],
        relatedConcepts: ["event network", "construct validity", "data provenance"],
      },
      "zh-hant": {
        title: "驗證行為軌跡連結",
        shortSummary: "只有在以另一來源驗證事件、門檻、行動者身分及社會意義後，才把紀錄或共同位置事件轉為邊。",
        concept: "行為軌跡網絡效度",
        visualLabel: "把事件轉為可辯護連結",
        scenario: "一所大學可取得門卡共同位置及討論紀錄，並想在不向學生提問下推斷同儕支援網絡。",
        nodes: "在相關系統及觀察期內能一致解析識別碼的修讀學生。",
        ties: "只有按預先指定時間、空間及頻率規則，才把候選共同位置或回覆事件轉為有向或無向邊。",
        networkType: "事件衍生時間及聚合網絡，社會意義不確定、重複觀察、系統缺失及私隱敏感識別碼。",
        procedure: "審核事件產生及身分配對，預先指定聚合與門檻，把候選連結與獲同意問卷或訪談證據比較，在可行情況估計精確率及召回率，並跨可辯護規則重複指標。",
        warning: "數碼軌跡記錄系統能看見甚麼，不一定是友誼、協助、注意、學習或同意；方便的大規模不能修補構念無效。",
        tags: ["行為軌跡", "連結效度", "學習分析"],
        relatedConcepts: ["事件網絡", "構念效度", "資料來源鏈"],
      },
      "zh-hans": {
        title: "验证行为轨迹连接",
        shortSummary: "只有在用另一来源验证事件、阈值、行动者身份及社会意义后，才把记录或共同位置事件转为边。",
        concept: "行为轨迹网络效度",
        visualLabel: "把事件转为可辩护连接",
        scenario: "一所大学可获得门卡共同位置及讨论记录，并想在不向学生提问下推断同伴支持网络。",
        nodes: "在相关系统及观察期内能一致解析标识码的修读学生。",
        ties: "只有按预先指定时间、空间及频率规则，才把候选共同位置或回复事件转为有向或无向边。",
        networkType: "事件衍生时间及聚合网络，社会意义不确定、重复观察、系统缺失及隐私敏感标识码。",
        procedure: "审核事件产生及身份配对，预先指定聚合与阈值，把候选连接与获同意问卷或访谈证据比较，在可行情况估计精确率及召回率，并跨可辩护规则重复指标。",
        warning: "数字轨迹记录系统能看见什么，不一定是友谊、帮助、注意、学习或同意；方便的大规模不能修补构念无效。",
        tags: ["行为轨迹", "连接效度", "学习分析"],
        relatedConcepts: ["事件网络", "构念效度", "数据来源链"],
      },
    },
  },
  {
    id: "academy-030",
    sequence: 30,
    slug: "integrate-sna-and-qualitative-interviews",
    track: "responsible-application",
    level: "applied",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-11",
    reviewedAt: "2026-08-11",
    durationMinutes: 16,
    sources: [
      {
        label: "Crossley and Edwards: Mixed-method social network analysis",
        url: "https://doi.org/10.5153/sro.3920",
      },
      {
        label: "Froehlich et al.: Mixed methods SNA in education research",
        url: "https://doi.org/10.3102/0091732X20903311",
      },
    ],
    text: {
      en: {
        title: "Integrate SNA and Qualitative Interviews",
        shortSummary:
          "Use a joint display to connect structural patterns with participants' meanings, disconfirming cases, and relation-specific explanations.",
        concept: "mixed-method social network analysis",
        visualLabel: "Network evidence beside contextual accounts",
        scenario:
          "A graduate program sees two apparent brokers and several peripheral students in an advice network and wants to understand whether those positions mean access, overload, avoidance, or missing data.",
        nodes: "All consenting graduate students in the whole-network survey and a purposively sampled subset for follow-up interviews.",
        ties: "Directed nominations of substantive research advice during the semester, paired with interview accounts of when, why, and with what consequence advice was sought.",
        networkType:
          "One-mode directed advice network integrated with purposive qualitative cases selected from several structural positions.",
        procedure:
          "Analyze the network first without naming individuals, sample maximum-variation and disconfirming cases, conduct relation-focused interviews, code mechanisms and exceptions, and build a joint display linking metrics, visuals, quotations, and revised interpretations.",
        warning:
          "Interviews do not merely decorate a graph and centrality does not define a person's experience; integration must preserve contradictions and avoid selecting only cases that confirm the map.",
        tags: ["mixed methods", "qualitative SNA", "joint display"],
        relatedConcepts: ["case selection", "triangulation", "mechanism"],
      },
      "zh-hant": {
        title: "整合SNA與質性訪談",
        shortSummary: "以聯合展示把結構模式連接至參與者意義、反證個案及關係特定解釋。",
        concept: "混合方法社會網絡分析",
        visualLabel: "網絡證據與情境敘述並列",
        scenario: "研究生課程在建議網絡看見兩名中介及多名外圍學生，並想了解這些位置代表渠道、過度負荷、避開還是缺失資料。",
        nodes: "完整網絡問卷內全部同意參與的研究生，以及為跟進訪談目的抽樣的子集。",
        ties: "學期內實質研究建議的有向提名，配合何時、為何及帶來甚麼後果之訪談敘述。",
        networkType: "單模式有向建議網絡，整合由多種結構位置目的抽取的質性個案。",
        procedure: "先在不具名下分析網絡，抽取最大差異及反證個案，進行聚焦關係的訪談，編碼機制與例外，再建立連結指標、圖像、引文及修訂詮釋的聯合展示。",
        warning: "訪談不是網絡圖裝飾，中心性也不能界定個人經驗；整合必須保留矛盾，避免只選擇確認網絡圖的個案。",
        tags: ["混合方法", "質性SNA", "聯合展示"],
        relatedConcepts: ["個案選擇", "三角互證", "機制"],
      },
      "zh-hans": {
        title: "整合SNA与质性访谈",
        shortSummary: "用联合展示把结构模式连接到参与者意义、反证个案及关系特定解释。",
        concept: "混合方法社会网络分析",
        visualLabel: "网络证据与情境叙述并列",
        scenario: "研究生课程在建议网络看见两名中介及多名外围学生，并想了解这些位置代表渠道、过度负荷、避开还是缺失数据。",
        nodes: "完整网络问卷内全部同意参与的研究生，以及为跟进访谈目的抽样的子集。",
        ties: "学期内实质研究建议的有向提名，配合何时、为何及带来什么后果之访谈叙述。",
        networkType: "单模式有向建议网络，整合由多种结构位置目的抽取的质性个案。",
        procedure: "先在不具名下分析网络，抽取最大差异及反证个案，进行聚焦关系的访谈，编码机制与例外，再建立连接指标、图像、引文及修订解释的联合展示。",
        warning: "访谈不是网络图装饰，中心性也不能界定个人经验；整合必须保留矛盾，避免只选择确认网络图的个案。",
        tags: ["混合方法", "质性SNA", "联合展示"],
        relatedConcepts: ["个案选择", "三角互证", "机制"],
      },
    },
  },
  {
    id: "academy-031",
    sequence: 31,
    slug: "identify-structural-equivalence-with-blockmodels",
    track: "network-theory",
    level: "advanced",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-14",
    reviewedAt: "2026-08-14",
    durationMinutes: 18,
    sources: [
      {
        label: "White et al.: Social structure from multiple networks",
        url: "https://doi.org/10.1086/226141",
      },
      {
        label: "Doreian et al.: Generalized blockmodeling",
        url: "https://doi.org/10.1017/CBO9780511584176",
      },
    ],
    text: {
      en: {
        title: "Identify Structural Equivalence with Blockmodels",
        shortSummary:
          "Group actors by similar patterns of relations to others, inspect the image matrix, and distinguish role equivalence from friendship or community.",
        concept: "structural equivalence and blockmodeling",
        visualLabel: "Relational roles compressed into blocks",
        scenario:
          "A cross-disciplinary center wants to find recurring collaboration roles even when students in the same role do not work directly with one another.",
        nodes: "All graduate researchers active in the center during the same year, with discipline and institution retained only for interpretation.",
        ties: "A directed collaboration report that one researcher contributed substantive work to another's project during the year.",
        networkType:
          "One-mode, directed, binary collaboration network with a fixed annual roster and no self-ties.",
        procedure:
          "Create outgoing and incoming relational profiles, calculate a justified similarity or dissimilarity, fit several block counts, inspect permuted matrices and block densities, and select a solution using fit plus substantive interpretability.",
        warning:
          "Structural equivalence means similar tie profiles, not personal similarity, mutual contact, status, community membership, or an objectively true role taxonomy.",
        tags: ["blockmodeling", "structural equivalence", "network roles"],
        relatedConcepts: ["image matrix", "CONCOR", "role analysis"],
      },
      "zh-hant": {
        title: "以區塊模型識別結構等價",
        shortSummary: "按與其他人相似的關係模式把行動者分組，檢視像矩陣，並區分角色等價與友誼或社群。",
        concept: "結構等價與區塊模型",
        visualLabel: "把關係角色壓縮成區塊",
        scenario: "跨學科中心希望找出重複協作角色，即使相同角色的學生彼此沒有直接合作。",
        nodes: "同一年度在中心活躍的全部研究生，學科及院校只保留作詮釋。",
        ties: "一名研究者在年度內為另一人項目提供實質工作的有向協作報告。",
        networkType: "單模式、有向、二元協作網絡，固定年度名冊且沒有自我連結。",
        procedure: "建立外向及入向關係輪廓，計算具理據的相似或不相似度，配適多個區塊數，檢視重新排列矩陣與區塊密度，再以適配度及實質可解釋性選擇方案。",
        warning: "結構等價代表相似連結輪廓，不是個人相似、互相聯絡、地位、社群成員身分或客觀真實角色分類。",
        tags: ["區塊模型", "結構等價", "網絡角色"],
        relatedConcepts: ["像矩陣", "CONCOR", "角色分析"],
      },
      "zh-hans": {
        title: "用区块模型识别结构等价",
        shortSummary: "按与其他人相似的关系模式把行动者分组，检视像矩阵，并区分角色等价与友谊或社群。",
        concept: "结构等价与区块模型",
        visualLabel: "把关系角色压缩成区块",
        scenario: "跨学科中心希望找出重复协作角色，即使相同角色的学生彼此没有直接合作。",
        nodes: "同一年度在中心活跃的全部研究生，学科及院校只保留作解释。",
        ties: "一名研究者在年度内为另一人项目提供实质工作的有向协作报告。",
        networkType: "单模式、有向、二元协作网络，固定年度名册且没有自连接。",
        procedure: "建立外向及入向关系轮廓，计算有依据的相似或不相似度，拟合多个区块数，检视重新排列矩阵与区块密度，再用拟合度及实质可解释性选择方案。",
        warning: "结构等价代表相似连接轮廓，不是个人相似、互相联系、地位、社群成员身份或客观真实角色分类。",
        tags: ["区块模型", "结构等价", "网络角色"],
        relatedConcepts: ["像矩阵", "CONCOR", "角色分析"],
      },
    },
  },
  {
    id: "academy-032",
    sequence: 32,
    slug: "separate-centrality-from-centralization",
    track: "network-theory",
    level: "foundation",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-15",
    reviewedAt: "2026-08-15",
    durationMinutes: 12,
    sources: [
      {
        label: "Freeman: Centrality in social networks",
        url: "https://doi.org/10.1016/0378-8733(78)90021-7",
      },
      {
        label: "Wasserman and Faust: Social Network Analysis",
        url: "https://doi.org/10.1017/CBO9780511815478",
      },
    ],
    text: {
      en: {
        title: "Separate Node Centrality from Network Centralization",
        shortSummary:
          "Distinguish an actor's position from the whole network's inequality around its most central position and keep the reference maximum visible.",
        concept: "centrality and network centralization",
        visualLabel: "Individual positions versus graph inequality",
        scenario:
          "Two departments each have a coordinator with in-degree 12, but one network distributes advice broadly while the other depends heavily on that coordinator.",
        nodes: "All staff in each department under the same census-date inclusion rule.",
        ties: "A directed report that one staff member sought substantive work advice from another during the last month.",
        networkType:
          "Two comparable one-mode directed binary whole networks with complete rosters, retained isolates, and identical tie wording.",
        procedure:
          "Calculate actor in-degree or another stated centrality, compute graph centralization as the normalized sum of gaps from the maximum, show the theoretical reference graph, and compare departments only under matched size and measurement.",
        warning:
          "A high-centrality actor and a highly centralized network are different claims; neither alone proves dependence, expertise, hierarchy, resilience, or performance.",
        tags: ["centrality", "centralization", "network comparison"],
        relatedConcepts: ["star graph", "degree inequality", "normalization"],
      },
      "zh-hant": {
        title: "區分節點中心性與網絡集中化",
        shortSummary: "區分行動者位置與整體網絡圍繞最中心位置的不均等，並清楚呈現參考最大值。",
        concept: "中心性與網絡集中化",
        visualLabel: "個人位置對圖不均等",
        scenario: "兩個部門各有一名入度12的統籌員，但一個網絡廣泛分散建議，另一個則高度依賴該統籌員。",
        nodes: "按相同普查日期納入規則界定的每個部門全部職員。",
        ties: "一名職員報告在過去一個月向另一人尋求實質工作建議的有向連結。",
        networkType: "兩個可比較單模式有向二元完整網絡，完整名冊、保留孤立節點及相同連結字眼。",
        procedure: "計算行動者入度或另一項已說明中心性，以距離最大值的差總和作標準化圖集中化，展示理論參考圖，並只在規模及量度匹配下比較部門。",
        warning: "高中心性行動者與高度集中化網絡是不同主張；兩者單獨均不能證明依賴、專業、階層、韌性或表現。",
        tags: ["中心性", "集中化", "網絡比較"],
        relatedConcepts: ["星形圖", "度數不均等", "標準化"],
      },
      "zh-hans": {
        title: "区分节点中心性与网络集中化",
        shortSummary: "区分行动者位置与整体网络围绕最中心位置的不均等，并清楚呈现参考最大值。",
        concept: "中心性与网络集中化",
        visualLabel: "个人位置对图不均等",
        scenario: "两个部门各有一名入度12的协调员，但一个网络广泛分散建议，另一个则高度依赖该协调员。",
        nodes: "按相同普查日期纳入规则界定的每个部门全部职员。",
        ties: "一名职员报告在过去一个月向另一人寻求实质工作建议的有向连接。",
        networkType: "两个可比较单模式有向二元完整网络，完整名册、保留孤立节点及相同连接字眼。",
        procedure: "计算行动者入度或另一项已说明中心性，用距离最大值的差总和作标准化图集中化，展示理论参考图，并只在规模及测量匹配下比较部门。",
        warning: "高中心性行动者与高度集中化网络是不同主张；两者单独均不能证明依赖、专业、层级、韧性或表现。",
        tags: ["中心性", "集中化", "网络比较"],
        relatedConcepts: ["星形图", "度数不均等", "标准化"],
      },
    },
  },
  {
    id: "academy-033",
    sequence: 33,
    slug: "compare-networks-across-groups",
    track: "methods-visualization",
    level: "advanced",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-17",
    reviewedAt: "2026-08-17",
    durationMinutes: 17,
    sources: [
      {
        label: "Krackhardt: QAP regression",
        url: "https://doi.org/10.1177/0049124187016001004",
      },
      {
        label: "van Duijn et al.: Multilevel analysis of personal networks",
        url: "https://doi.org/10.1016/S0378-8733(99)00009-X",
      },
    ],
    text: {
      en: {
        title: "Compare Networks Across Groups",
        shortSummary:
          "Harmonize boundaries and tie opportunities, show distributions across networks, and avoid treating dependent dyads as independent observations.",
        concept: "multi-network group comparison",
        visualLabel: "Matched network distributions",
        scenario:
          "A faculty-development program wants to compare advice networks in 24 schools that vary in roster size, response coverage, and formal team structure.",
        nodes: "The eligible staff roster separately defined for each school under the same census date and role rules.",
        ties: "A directed advice nomination using identical wording and observation windows in every school.",
        networkType:
          "Twenty-four directed binary whole networks with school-level covariates, unequal sizes, retained isolates, and documented coverage.",
        procedure:
          "Create a harmonization table, use size-aware or normalized summaries, plot the full school distribution, apply permutation or hierarchical network methods that retain dependence, and run leave-one-school-out sensitivity.",
        warning:
          "Raw density, path length, and centralization change with size, opportunity, response, and composition; a difference between schools is not automatically a program effect.",
        tags: ["network comparison", "multiple groups", "QAP"],
        relatedConcepts: ["multilevel network", "normalization", "permutation"],
      },
      "zh-hant": {
        title: "跨組別比較網絡",
        shortSummary: "協調邊界與連結機會，展示多個網絡的分布，並避免把相依二元關係當作獨立觀察。",
        concept: "多網絡組別比較",
        visualLabel: "匹配網絡分布",
        scenario: "教師發展計劃希望比較24所學校的建議網絡，而各校名冊規模、回應涵蓋及正式團隊結構不同。",
        nodes: "按相同普查日期及角色規則，為每所學校分開界定的合資格職員名冊。",
        ties: "每所學校採用相同字眼及觀察時間窗的有向建議提名。",
        networkType: "二十四個有向二元完整網絡，包含學校層協變量、不等規模、保留孤立節點及有文件的涵蓋率。",
        procedure: "建立協調表，使用考慮規模或標準化摘要，繪出完整學校分布，採用保留依賴的置換或階層網絡方法，並作逐校剔除敏感度。",
        warning: "原始密度、路徑長度及集中化會隨規模、機會、回應及組成改變；學校差異不自動代表計劃效果。",
        tags: ["網絡比較", "多個組別", "QAP"],
        relatedConcepts: ["多層次網絡", "標準化", "置換"],
      },
      "zh-hans": {
        title: "跨组别比较网络",
        shortSummary: "协调边界与连接机会，展示多个网络的分布，并避免把相依二元关系当作独立观察。",
        concept: "多网络组别比较",
        visualLabel: "匹配网络分布",
        scenario: "教师发展项目希望比较24所学校的建议网络，而各校名册规模、回应覆盖及正式团队结构不同。",
        nodes: "按相同普查日期及角色规则，为每所学校分开界定的符合条件职员名册。",
        ties: "每所学校采用相同字眼及观察时间窗的有向建议提名。",
        networkType: "二十四个有向二元完整网络，包含学校层协变量、不等规模、保留孤立节点及有文档的覆盖率。",
        procedure: "建立协调表，使用考虑规模或标准化摘要，绘出完整学校分布，采用保留依赖的置换或层级网络方法，并作逐校剔除敏感度。",
        warning: "原始密度、路径长度及集中化会随规模、机会、回应及组成改变；学校差异不自动代表项目效果。",
        tags: ["网络比较", "多个组别", "QAP"],
        relatedConcepts: ["多层次网络", "标准化", "置换"],
      },
    },
  },
  {
    id: "academy-034",
    sequence: 34,
    slug: "separate-diffusion-from-homophily",
    track: "responsible-application",
    level: "advanced",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-18",
    reviewedAt: "2026-08-18",
    durationMinutes: 18,
    sources: [
      {
        label: "Shalizi and Thomas: Homophily and contagion are confounded",
        url: "https://doi.org/10.1177/0049124111404820",
      },
      {
        label: "Lyons: Evidence-poor medicine and flawed social-network analysis",
        url: "https://doi.org/10.2202/2151-7509.1024",
      },
    ],
    text: {
      en: {
        title: "Separate Diffusion from Homophily",
        shortSummary:
          "Use time ordering and a defensible identification strategy before claiming that connected students transmitted an attitude, behavior, or outcome.",
        concept: "diffusion, influence, and homophily confounding",
        visualLabel: "Selection and change on one timeline",
        scenario:
          "Students with connected study partners become more similar in attendance over a year, and a dashboard labels the pattern as peer influence.",
        nodes: "Students eligible throughout the longitudinal observation period, with entry, exit, exposure opportunities, and baseline attendance recorded.",
        ties: "Time-stamped study-partner nominations observed before and during repeated attendance measurements.",
        networkType:
          "Longitudinal directed network and repeated behavior data with changing ties, shared environments, and measured plus unmeasured confounders.",
        procedure:
          "Draw a temporal causal diagram, distinguish prior similarity from later convergence, measure shared contexts, specify an identification strategy or randomized encouragement where feasible, test negative controls, and report effects only under stated assumptions.",
        warning:
          "Connected people can resemble one another because of selection, shared context, measurement, simultaneous change, or influence; ordinary regression cannot generally separate these explanations.",
        tags: ["social influence", "homophily", "causal inference"],
        relatedConcepts: ["selection", "contagion", "shared environment"],
      },
      "zh-hant": {
        title: "區分擴散與同質性",
        shortSummary: "在聲稱相連學生傳遞態度、行為或結果前，使用時間次序及可辯護識別策略。",
        concept: "擴散、影響與同質性混淆",
        visualLabel: "同一時間線上的選擇與改變",
        scenario: "彼此相連的溫習伙伴在一年內出席變得更相似，儀表板把模式標示為同儕影響。",
        nodes: "整個縱向觀察期合資格的學生，並記錄加入、退出、接觸機會及基線出席。",
        ties: "在重複出席量度之前及期間觀察的具時間戳溫習伙伴提名。",
        networkType: "縱向有向網絡及重複行為資料，包含變動連結、共同環境及已量度與未量度混淆。",
        procedure: "繪製時間因果圖，區分既往相似與其後收斂，量度共同情境，指定識別策略或可行情況下隨機鼓勵，檢驗負對照，並只在已說明假設下報告效果。",
        warning: "相連人物可以因選擇、共同情境、量度、同時改變或影響而相似；普通迴歸一般不能分開這些解釋。",
        tags: ["社會影響", "同質性", "因果推論"],
        relatedConcepts: ["選擇", "傳染", "共同環境"],
      },
      "zh-hans": {
        title: "区分扩散与同质性",
        shortSummary: "在声称相连学生传递态度、行为或结果前，使用时间次序及可辩护识别策略。",
        concept: "扩散、影响与同质性混淆",
        visualLabel: "同一时间线上的选择与改变",
        scenario: "彼此相连的复习伙伴在一年内出席变得更相似，仪表板把模式标记为同伴影响。",
        nodes: "整个纵向观察期符合条件的学生，并记录加入、退出、接触机会及基线出席。",
        ties: "在重复出席测量之前及期间观察的带时间戳复习伙伴提名。",
        networkType: "纵向有向网络及重复行为数据，包含变动连接、共同环境及已测量与未测量混淆。",
        procedure: "绘制时间因果图，区分既往相似与其后收敛，测量共同情境，指定识别策略或可行情况下随机鼓励，检验负对照，并只在已说明假设下报告效果。",
        warning: "相连人物可以因选择、共同情境、测量、同时改变或影响而相似；普通回归一般不能分开这些解释。",
        tags: ["社会影响", "同质性", "因果推论"],
        relatedConcepts: ["选择", "传染", "共同环境"],
      },
    },
  },
  {
    id: "academy-035",
    sequence: 35,
    slug: "preregister-an-sna-study",
    track: "responsible-application",
    level: "advanced",
    analysisApproach: "social-network-analysis",
    publishedAt: "2026-08-21",
    reviewedAt: "2026-08-21",
    durationMinutes: 17,
    sources: [
      {
        label: "Nosek et al.: The preregistration revolution",
        url: "https://doi.org/10.1073/pnas.1708274114",
      },
      {
        label: "Lakens: Justify sample size before data collection",
        url: "https://doi.org/10.1177/2515245918770963",
      },
    ],
    text: {
      en: {
        title: "Preregister an SNA Study",
        shortSummary:
          "Commit the network boundary, tie construction, exclusions, metrics, model, sensitivity checks, privacy plan, and decision rule before inspecting outcomes.",
        concept: "preregistration for social network analysis",
        visualLabel: "Time-stamped network analysis contract",
        scenario:
          "A multi-school team plans to test whether a professional-learning program changes cross-department advice ties and wants to prevent outcome-driven graph choices.",
        nodes: "Eligible educators in participating and comparison schools under a census-date roster rule written before data collection.",
        ties: "A directed teaching-advice nomination during a fixed eight-week window, with wording, cap, weight, and missingness rule frozen in advance.",
        networkType:
          "Repeated directed whole networks nested in schools, with planned comparisons, school assignment, actor attributes, and protected relational data.",
        procedure:
          "Register hypotheses, estimands, boundary and tie rules, timing, exclusions, missingness, metric formulas, model terms, convergence and fit criteria, multiplicity control, sensitivity analyses, privacy governance, stopping rules, code plan, and permitted exploratory work.",
        warning:
          "Preregistration cannot rescue an invalid tie or unethical design, and deviations can be legitimate only when dated, justified, and reported separately from confirmatory analyses.",
        tags: ["preregistration", "research design", "open science"],
        relatedConcepts: ["registered report", "analysis plan", "specification curve"],
      },
      "zh-hant": {
        title: "預先登記一項SNA研究",
        shortSummary: "在檢視結果前，承諾網絡邊界、連結建構、排除、指標、模型、敏感度檢查、私隱計劃及決策規則。",
        concept: "社會網絡分析預先登記",
        visualLabel: "具時間戳的網絡分析合約",
        scenario: "多校團隊計劃檢驗專業學習計劃是否改變跨部門建議連結，並希望防止由結果驅動的圖選擇。",
        nodes: "按資料收集前寫定的普查日期名冊規則，界定參與及比較學校的合資格教育者。",
        ties: "固定八週時間窗內的有向教學建議提名，字眼、上限、權重及缺失規則均預先固定。",
        networkType: "學校內巢狀的重複有向完整網絡，包含預定比較、學校分配、行動者屬性及受保護關係資料。",
        procedure: "登記假設、估計目標、邊界與連結規則、時間、排除、缺失、指標公式、模型項、收斂與適配標準、多重性控制、敏感度分析、私隱治理、停止規則、程式計劃及獲准探索工作。",
        warning: "預先登記不能挽救無效連結或不合倫理設計；偏離只有在註明日期、提出理由並與驗證性分析分開報告時才合理。",
        tags: ["預先登記", "研究設計", "開放科學"],
        relatedConcepts: ["註冊報告", "分析計劃", "規格曲線"],
      },
      "zh-hans": {
        title: "预先登记一项SNA研究",
        shortSummary: "在检视结果前，承诺网络边界、连接构建、排除、指标、模型、敏感度检查、隐私计划及决策规则。",
        concept: "社会网络分析预先登记",
        visualLabel: "带时间戳的网络分析合同",
        scenario: "多校团队计划检验专业学习项目是否改变跨部门建议连接，并希望防止由结果驱动的图选择。",
        nodes: "按数据收集前写定的普查日期名册规则，界定参与及比较学校的符合条件教育者。",
        ties: "固定八周时间窗内的有向教学建议提名，字眼、上限、权重及缺失规则均预先固定。",
        networkType: "学校内嵌套的重复有向完整网络，包含预定比较、学校分配、行动者属性及受保护关系数据。",
        procedure: "登记假设、估计目标、边界与连接规则、时间、排除、缺失、指标公式、模型项、收敛与拟合标准、多重性控制、敏感度分析、隐私治理、停止规则、代码计划及获准探索工作。",
        warning: "预先登记不能挽救无效连接或不合伦理设计；偏离只有在注明日期、提出理由并与验证性分析分开报告时才合理。",
        tags: ["预先登记", "研究设计", "开放科学"],
        relatedConcepts: ["注册报告", "分析计划", "规格曲线"],
      },
    },
  },
];

export const backfillAcademyLessons: AcademyLessonRecord[] =
  lessons.map(createLesson);
