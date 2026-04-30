import { Language } from "./translations";

export interface Chapter {
  id: number;
  title: string;
  content: string;
  keyIdea: string;
}

export const BOOKLET_CONTENT: Record<Language, Chapter[]> = {
  en: [
    {
      id: 1,
      title: "The Beginning (Childhood & Conflict)",
      content: "Every child, while playing football or street games, eventually enters conflict. Conflict becomes a natural way of asserting presence and identity. The founder, Bouabid Cherkaoui, experienced this reality early in the streets, where the game often transformed into a struggle for respect and space.",
      keyIdea: "Combat begins as instinct before becoming skill."
    },
    {
      id: 2,
      title: "The Search for Skill",
      content: "Driven by the need to understand these conflicts, the founder entered martial arts clubs—karate, boxing, wrestling, and more. He expected structured skill development that would translate to the world outside. However, he soon realized a stark reality: the techniques worked perfectly inside controlled environments, but felt rigid and disconnected from the raw energy of the street.",
      keyIdea: "Gym ≠ Reality"
    },
    {
      id: 3,
      title: "The Shock of Reality",
      content: "Real confrontations are chaotic. There are no rules, no mats, and no referees. Speed, reaction, and unpredictability dominate the space. In these moments, opponent energy is hidden and dynamic, shifting faster than any pre-rehearsed drill can follow. Reality exposes the limits of rigid systems.",
      keyIdea: "Reality exposes the limits of rigid systems."
    },
    {
      id: 4,
      title: "The Question",
      content: "This realization led to a core philosophical question that would drive the next five decades of research: 'How can a fighter adapt in a world governed by chaos, pressure, and unpredictability?' It wasn't about finding a better technique, but about finding a better way to exist within the conflict.",
      keyIdea: "Adaptation is the only constant."
    },
    {
      id: 5,
      title: "The Birth of TCHUNGU",
      content: "The founder began studying multiple disciplines not to collect techniques, but to observe patterns. By engaging in real duels and observing the mechanics of movement under extreme pressure, he began building a system based on adaptation rather than fixed responses. TCHUNGU was born from the synthesis of science, instinct, and experience.",
      keyIdea: "Patterns over techniques."
    },
    {
      id: 6,
      title: "The Seven Pillars Emergence",
      content: "As the system evolved, seven fundamental pillars emerged: Technique, Combat, Harmony, Union, Notes, Gesture, and Ultimate. Each pillar was not a theoretical concept but a practical necessity discovered through real-life testing. They represent the complete spectrum of combat—from the internal mechanics of a joint to the psychological warfare of a duel.",
      keyIdea: "Necessity drives structure."
    },
    {
      id: 7,
      title: "The Long Journey (54 Years)",
      content: "For 54 years, the research has never stopped. Continuous testing in real-life scenarios and the evolution of understanding have shown that there is no final 'end point' in mastery. The system must remain as dynamic as the world it inhabits.",
      keyIdea: "Mastery is continuous adaptation."
    },
    {
      id: 8,
      title: "The Philosophy of Environment",
      content: "Technique is not a standalone truth; it depends entirely on the environment. A strike in a ring is different from a strike in a narrow corridor or on uneven ground. Each combat context is different, and no universal technique exists without the intelligence of adaptation.",
      keyIdea: "Context dictates form."
    },
    {
      id: 9,
      title: "The Living System",
      content: "TCHUNGU is not a fixed martial art. It is not limited to one sport or one type of practitioner. It is a living system that evolves with the person who studies it, providing a framework for understanding energy, mechanics, and human behavior in any high-pressure environment.",
      keyIdea: "TCHUNGU is a framework for life."
    }
  ],
  ar: [
    {
      id: 1,
      title: "البداية (الطفولة والصراع)",
      content: "كل طفل، أثناء لعب كرة القدم أو ألعاب الشارع، يدخل في النهاية في صراع. يصبح الصراع طريقة طبيعية لفرض الحضور والهوية. اختبر المؤسس، بوعبيد الشرقاوي، هذا الواقع مبكرًا في الشوارع، حيث كانت اللعبة تتحول غالبًا إلى صراع من أجل الاحترام والمساحة.",
      keyIdea: "يبدأ القتال كغريزة قبل أن يصبح مهارة."
    },
    {
      id: 2,
      title: "البحث عن المهارة",
      content: "مدفوعًا بالحاجة لفهم هذه الصراعات، دخل المؤسس نوادي الفنون القتالية - الكاراتيه، الملاكمة، المصارعة، وأكثر. توقع تطوير مهارات منظمة تترجم إلى العالم الخارجي. ومع ذلك، سرعان ما أدرك واقعًا صارخًا: التقنيات تعمل بشكل مثالي داخل البيئات الخاضعة للرقابة، لكنها بدت جامدة ومنفصلة عن الطاقة الخام للشارع.",
      keyIdea: "النادي ≠ الواقع"
    },
    {
      id: 3,
      title: "صدمة الواقع",
      content: "المواجهات الحقيقية فوضوية. لا توجد قواعد، ولا حصير، ولا حكام. السرعة ورد الفعل وعدم التنبؤ هي التي تهيمن على الفضاء. في هذه اللحظات، تكون طاقة الخصم مخفية وديناميكية، وتتحول بشكل أسرع من أي تدريب مخطط مسبقًا. يكشف الواقع حدود الأنظمة الجامدة.",
      keyIdea: "الواقع يكشف حدود الأنظمة الجامدة."
    },
    {
      id: 4,
      title: "السؤال",
      content: "أدى هذا الإدراك إلى سؤال فلسفي جوهري قاد خمسة عقود من البحث: 'كيف يمكن للمقاتل أن يتكيف في عالم تحكمه الفوضى والضغط وعدم التنبؤ؟' لم يكن الأمر يتعلق بإيجاد تقنية أفضل، بل بإيجاد طريقة أفضل للوجود داخل الصراع.",
      keyIdea: "التكيف هو الثابت الوحيد."
    },
    {
      id: 5,
      title: "ميلاد تشونغو",
      content: "بدأ المؤسس دراسة تخصصات متعددة ليس لجمع التقنيات، بل لمراقبة الأنماط. من خلال الانخراط في مبارزات حقيقية ومراقبة ميكانيكا الحركة تحت ضغط شديد، بدأ في بناء نظام يعتمد على التكيف بدلاً من الاستجابات الثابتة. وُلد تشونغو من مزج العلم والغريزة والخبرة.",
      keyIdea: "الأنماط فوق التقنيات."
    },
    {
      id: 6,
      title: "ظهور الأعمدة السبعة",
      content: "مع تطور النظام، ظهرت سبعة أعمدة أساسية: التقنية، القتال، الانسجام، الاتحاد، الملاحظات، الإيماءة، والذروة. لم يكن كل عمود مفهوماً نظرياً بل ضرورة عملية اكتُشفت من خلال الاختبارات الواقعية. إنها تمثل الطيف الكامل للقتال - من الميكانيكا الداخلية للمفصل إلى الحرب النفسية للمبارزة.",
      keyIdea: "الضرورة تقود الهيكل."
    },
    {
      id: 7,
      title: "الرحلة الطويلة (54 عامًا)",
      content: "لمدة 54 عامًا، لم يتوقف البحث أبدًا. أظهرت الاختبارات المستمرة في سيناريوهات الحياة الواقعية وتطور الفهم أنه لا توجد 'نقطة نهاية' نهائية في الإتقان. يجب أن يظل النظام بنفس ديناميكية العالم الذي يسكنه.",
      keyIdea: "الإتقان هو التكيف المستمر."
    },
    {
      id: 8,
      title: "فلسفة البيئة",
      content: "التقنية ليست حقيقة قائمة بذاتها؛ إنها تعتمد كلياً على البيئة. اللكمة في الحلبة تختلف عن اللكمة في ممر ضيق أو على أرض غير مستوية. كل سياق قتالي يختلف، ولا توجد تقنية عالمية بدون ذكاء التكيف.",
      keyIdea: "السياق يملي الشكل."
    },
    {
      id: 9,
      title: "النظام الحي",
      content: "تشونغو ليس فنًا قتاليًا ثابتًا. لا يقتصر على رياضة واحدة أو نوع واحد من الممارسين. إنه نظام حي يتطور مع الشخص الذي يدرسه، ويوفر إطارًا لفهم الطاقة والميكانيكا والسلوك البشري في أي بيئة عالية الضغط.",
      keyIdea: "تشونغو إطار للحياة."
    }
  ],
  fr: [
    {
      id: 1,
      title: "Le Commencement (Enfance & Conflit)",
      content: "Chaque enfant, en jouant au football ou à des jeux de rue, finit par entrer en conflit. Le conflit devient un moyen naturel d'affirmer sa présence et son identité. Le fondateur, Bouabid Cherkaoui, a vécu cette réalité tôt dans les rues, où le jeu se transformait souvent en une lutte pour le respect et l'espace.",
      keyIdea: "Le combat commence par l'instinct avant de devenir une compétence."
    },
    {
      id: 2,
      title: "La Recherche de Compétences",
      content: "Poussé par le besoin de comprendre ces conflits, le fondateur a rejoint des clubs d'arts martiaux : karaté, boxe, lutte, etc. Il s'attendait à un développement structuré des compétences qui se traduirait dans le monde extérieur. Cependant, il a vite réalisé une réalité frappante : les techniques fonctionnaient parfaitement dans des environnements contrôlés, mais semblaient rigides et déconnectées de l'énergie brute de la rue.",
      keyIdea: "Club ≠ Réalité"
    },
    {
      id: 3,
      title: "Le Choc de la Réalité",
      content: "Les confrontations réelles sont chaotiques. Il n'y a pas de règles, pas de tapis, pas d'arbitres. La vitesse, la réaction et l'imprévisibilité dominent l'espace. Dans ces moments, l'énergie de l'adversaire est cachée et dynamique, changeant plus vite que n'importe quel entraînement pré-répété. La réalité expose les limites des systèmes rigides.",
      keyIdea: "La réalité expose les limites des systèmes rigides."
    },
    {
      id: 4,
      title: "La Question",
      content: "Cette réalisation a conduit à une question philosophique centrale qui allait guider les cinq décennies suivantes de recherche : 'Comment un combattant peut-il s'adapter dans un monde régi par le chaos, la pression et l'imprévisibilité ?' Il ne s'agissait pas de trouver une meilleure technique, mais de trouver une meilleure façon d'exister au sein du conflit.",
      keyIdea: "L'adaptation est la seule constante."
    },
    {
      id: 5,
      title: "La Naissance de TCHUNGU",
      content: "Le fondateur a commencé à étudier plusieurs disciplines non pas pour collectionner des techniques, mais pour observer des formes récurrentes. En s'engageant dans de vrais duels et en observant la mécanique du mouvement sous une pression extrême, il a commencé à construire un système basé sur l'adaptation plutôt que sur des réponses fixes. TCHUNGU est né de la synthèse de la science, de l'instinct et de l'expérience.",
      keyIdea: "Des modèles plutôt que des techniques."
    },
    {
      id: 6,
      title: "L'Émergence des Sept Piliers",
      content: "Au fur et à mesure que le système évoluait, sept piliers fondamentaux ont émergé : Technique, Combat, Harmonie, Union, Notes, Geste et Ultime. Chaque pilier n'était pas un concept théorique mais une nécessité pratique découverte par des tests réels. Ils représentent tout le spectre du combat — de la mécanique interne d'une articulation à la guerre psychologique d'un duel.",
      keyIdea: "La nécessité dicte la structure."
    },
    {
      id: 7,
      title: "Le Long Voyage (54 Ans)",
      content: "Pendant 54 ans, la recherche n'a jamais cessé. Des tests continus dans des scénarios de la vie réelle et l'évolution de la compréhension ont montré qu'il n'y a pas de 'point final' dans la maîtrise. Le système doit rester aussi dynamique que le monde dans lequel il évolue.",
      keyIdea: "La maîtrise est une adaptation continue."
    },
    {
      id: 8,
      title: "La Philosophie de l'Environnement",
      content: "La technique n'est pas une vérité autonome ; elle dépend entièrement de l'environnement. Un coup sur un ring est différent d'un coup dans un couloir étroit ou sur un sol inégal. Chaque contexte de combat est différent, et aucune technique universelle n'existe sans l'intelligence de l'adaptation.",
      keyIdea: "Le contexte dicte la forme."
    },
    {
      id: 9,
      title: "Le Système Vivant",
      content: "TCHUNGU n'est pas un art martial fixe. Il n'est pas limité à un seul sport ou à un seul type de pratiquant. C'est un système vivant qui évolue avec la personne qui l'étudie, fournissant un cadre pour comprendre l'énergie, la mécanique et le comportement humain dans tout environnement à haute pression.",
      keyIdea: "TCHUNGU est un cadre pour la vie."
    }
  ],
  zh: [
    {
      id: 1,
      title: "开始（童年与冲突）",
      content: "每个孩子在踢足球或玩街头游戏时，最终都会进入冲突。冲突成为断定存在感和身份的自然方式。创始人 Bouabid Cherkaoui 在街道上很早就体验到了这种现实，那里的游戏经常演变成争取尊重和空间的斗争。",
      keyIdea: "战斗在成为技能之前始于本能。"
    },
    {
      id: 2,
      title: "寻找技能",
      content: "出于理解这些冲突的需要，创始人进入了武术俱乐部——空手道、拳击、摔跤等。他期待结构化的技能发展，并能应用到外部世界。然而，他很快意识到一个残酷的现实：这些技术在受控环境中表现完美，但在街头的原始能量面前感到僵硬且脱节。",
      keyIdea: "健身房 ≠ 现实"
    },
    {
      id: 3,
      title: "现实的冲击",
      content: "真正的对抗是混乱的。没有规则，没有垫子，也没有裁判。速度、反应和不可预测性主宰着空间。在这些时刻，对手的能量是隐藏且动态的，变化的频率比任何预先排练的练习都要快。现实暴露了僵化系统的局限性。",
      keyIdea: "现实暴露了僵化系统的局限性。"
    },
    {
      id: 4,
      title: "问题",
      content: "这一认识引出了一个核心哲学问题，它推动了随后五十年的研究：'在受混乱、压力和不可预测性支配的世界中，战士该如何适应？' 这不是为了寻找更好的技术，而是为了寻找在冲突中更好地生存的方式。",
      keyIdea: "适应是唯一的永恒。"
    },
    {
      id: 5,
      title: "TCHUNGU 的诞生",
      content: "创始人开始研究多门学科，不是为了收集技术，而是为了观察模式。通过参与真正的决斗并观察极端压力下的运动力学，他开始建立一个基于适应而非固定反应的系统。TCHUNGU 诞生于科学、本能和经验的融合。",
      keyIdea: "模式重于技术。"
    },
    {
      id: 6,
      title: "七个支柱的出现",
      content: "随着系统的发展，出现了七个基本支柱：技术、战斗、和谐、联合、笔记、姿态和终极。每个支柱不是理论概念，而是通过现实生活测试发现的实际需要。它们代表了战斗的全谱——从关节的内部力学到决斗的心理战。",
      keyIdea: "需求决定结构。"
    },
    {
      id: 7,
      title: "漫长旅程（54年）",
      content: "54年来，研究从未停止。在现实生活场景中的持续测试和理解的演进表明，精通没有最终的'终点'。系统必须保持与其所处世界一样的动态。",
      keyIdea: "精通是持续的适应。"
    },
    {
      id: 8,
      title: "环境哲学",
      content: "技术不是独立的真理；它完全取决于环境。擂台上的打击不同于窄道或不平坦地面上的打击。每个战斗背景都不同，没有适应的智慧，就没有通用的技术。",
      keyIdea: "背景决定形式。"
    },
    {
      id: 9,
      title: "生命系统",
      content: "TCHUNGU 不是固定的武术。它不限于一种运动或一类从业者。它是一个生命系统，随学习者的成长而进化，为理解任何高压环境下的能量、力学和人类行为提供框架。",
      keyIdea: "TCHUNGU 是生活的框架。"
    }
  ]
};
