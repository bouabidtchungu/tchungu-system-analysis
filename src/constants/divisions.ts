import { Division } from "../types";
import { Language } from "./translations";
import { 
  Hand, 
  Zap, 
  Move, 
  Shield, 
  Activity, 
  Target, 
  Eye, 
  UserCheck,
  LucideIcon
} from "lucide-react";

export interface DivisionInfo {
  id: Division;
  title: string;
  focus: string;
  goal: string;
  evaluation: string[];
  icon: LucideIcon;
  description: string;
}

export const DIVISIONS_DATA: Record<Language, DivisionInfo[]> = {
  en: [
    {
      id: Division.HAND_STRIKING,
      title: "Hand Striking Division",
      focus: "Precision, timing, distance, angles",
      goal: "Master efficient and intelligent hand striking",
      evaluation: ["Technique", "Timing", "Accuracy", "Control"],
      icon: Hand,
      description: "Focuses on the art of boxing and precise hand-to-eye coordination. Mastery of distance and angles is paramount."
    },
    {
      id: Division.FULL_STRIKING,
      title: "Full Striking Division",
      focus: "Hands + Legs coordination",
      goal: "Develop complete striking ability in standing combat",
      evaluation: ["Balance", "Flow", "Range", "Combination"],
      icon: Move,
      description: "Integrates kicks, knees, and elbows with hand strikes. Requires exceptional balance and fluid transitions between ranges."
    },
    {
      id: Division.STRIKING_TAKEDOWN,
      title: "Striking & Takedown Division",
      focus: "Transition from striking to control",
      goal: "Dominate both standing and takedown phases",
      evaluation: ["Timing", "Entry", "Control", "Execution"],
      icon: Activity,
      description: "The bridge between standing and ground. Focuses on the 'shoot' and the intelligent transition from striking to wrestling."
    },
    {
      id: Division.GROUND_FIGHTING,
      title: "Ground Fighting Division",
      focus: "Control, submission, positioning",
      goal: "Master ground dominance and finishing techniques",
      evaluation: ["Stability", "Control", "Submission", "Defense"],
      icon: Shield,
      description: "Mastery of the horizontal plane. Focuses on leverage, pressure, and the technical application of submissions."
    },
    {
      id: Division.MIXED_COMBAT,
      title: "Mixed Combat Division",
      focus: "Full integration of all combat elements",
      goal: "Adapt to any situation with no limitations",
      evaluation: ["Adaptability", "Flow", "Decision", "Efficiency"],
      icon: Zap,
      description: "The ultimate expression of TCHUNGU. Seamless integration of all ranges and styles with no artificial boundaries."
    },
    {
      id: Division.GRAPPLING,
      title: "Grappling Division",
      focus: "Control without striking",
      goal: "Neutralize opponent through positioning and leverage",
      evaluation: ["Grip", "Balance", "Control", "Transition"],
      icon: UserCheck,
      description: "Pure control. Using physics and biomechanics to neutralize threats without the need for impact."
    },
    {
      id: Division.TACTICAL_DEFENSE,
      title: "Tactical Defense Division",
      focus: "Real-world self-defense scenarios",
      goal: "Survive, control, and neutralize threats",
      evaluation: ["Awareness", "Reaction", "Efficiency", "Safety"],
      icon: Eye,
      description: "Survival in high-stress environments. Focuses on rapid threat assessment and efficient neutralization."
    },
    {
      id: Division.PERSONAL_PROTECTION,
      title: "Personal Protection Division",
      focus: "Avoidance and minimal engagement",
      goal: "Protect without escalation",
      evaluation: ["Decision", "Distance", "Escape", "Awareness"],
      icon: Target,
      description: "The highest form of defense is avoidance. Focuses on de-escalation, environmental awareness, and safe extraction."
    }
  ],
  ar: [
    {
      id: Division.HAND_STRIKING,
      title: "قسم الضرب باليدين",
      focus: "الدقة، التوقيت، المسافة، الزوايا",
      goal: "إتقان الضرب اليدوي الفعال والذكي",
      evaluation: ["التقنية", "التوقيت", "الدقة", "التحكم"],
      icon: Hand,
      description: "يركز على فن الملاكمة والتنسيق الدقيق بين اليد والعين. إتقان المسافة والزوايا أمر أساسي."
    },
    {
      id: Division.FULL_STRIKING,
      title: "قسم الضرب الكامل",
      focus: "التنسيق بين اليدين والرجلين",
      goal: "تطوير قدرة ضرب كاملة في القتال الواقف",
      evaluation: ["التوازن", "الانسيابية", "المدى", "التركيب"],
      icon: Move,
      description: "يدمج الركلات والركبتين والمرفقين مع ضربات اليد. يتطلب توازناً استثنائياً وتنقلات سلسة بين المدايات."
    },
    {
      id: Division.STRIKING_TAKEDOWN,
      title: "قسم الضرب والإسقاط",
      focus: "الانتقال من الضرب إلى التحكم",
      goal: "السيطرة على مرحلتي الوقوف والإسقاط",
      evaluation: ["التوقيت", "الدخول", "التحكم", "التنفيذ"],
      icon: Activity,
      description: "الجسر بين الوقوف والأرض. يركز على 'shoot' والانتقال الذكي من الضرب إلى المصارعة."
    },
    {
      id: Division.GROUND_FIGHTING,
      title: "قسم القتال الأرضي",
      focus: "التحكم، الإخضاع، التمركز",
      goal: "إتقان الهيمنة الأرضية وتقنيات الإنهاء",
      evaluation: ["الاستقرار", "التحكم", "الإخضاع", "الدفاع"],
      icon: Shield,
      description: "إتقان المستوى الأفقي. يركز على الرافعة والضغط والتطبيق التقني للإخضاعات."
    },
    {
      id: Division.MIXED_COMBAT,
      title: "قسم القتال المختلط",
      focus: "التكامل الكامل لجميع عناصر القتال",
      goal: "التكيف مع أي موقف دون قيود",
      evaluation: ["التكيف", "الانسيابية", "القرار", "الكفاءة"],
      icon: Zap,
      description: "التعبير الأسمى لتشونغو. تكامل سلس لجميع المدايات والأساليب دون حدود اصطناعية."
    },
    {
      id: Division.GRAPPLING,
      title: "قسم المصارعة (Grappling)",
      focus: "التحكم بدون ضرب",
      goal: "تحييد الخصم من خلال التمركز والرافعة",
      evaluation: ["القبضة", "التوازن", "التحكم", "الانتقال"],
      icon: UserCheck,
      description: "تحكم نقي. استخدام الفيزياء والميكانيكا الحيوية لتحييد التهديدات دون الحاجة للتأثير."
    },
    {
      id: Division.TACTICAL_DEFENSE,
      title: "قسم الدفاع التكتيكي",
      focus: "سيناريوهات الدفاع عن النفس الواقعية",
      goal: "البقاء، التحكم، وتحييد التهديدات",
      evaluation: ["الوعي", "رد الفعل", "الكفاءة", "الأمان"],
      icon: Eye,
      description: "البقاء في البيئات عالية الضغط. يركز على التقييم السريع للتهديدات والتحييد الفعال."
    },
    {
      id: Division.PERSONAL_PROTECTION,
      title: "قسم الحماية الشخصية",
      focus: "التجنب والاشتباك الأدنى",
      goal: "الحماية دون تصعيد",
      evaluation: ["القرار", "المسافة", "الهروب", "الوعي"],
      icon: Target,
      description: "أعلى أشكال الدفاع هو التجنب. يركز على خفض التصعيد، والوعي البيئي، والاستخراج الآمن."
    }
  ],
  fr: [
    {
      id: Division.HAND_STRIKING,
      title: "Division de Frappe des Mains",
      focus: "Précision, timing, distance, angles",
      goal: "Maîtriser une frappe manuelle efficace et intelligente",
      evaluation: ["Technique", "Timing", "Précision", "Contrôle"],
      icon: Hand,
      description: "Se concentre sur l'art de la boxe et la coordination main-œil précise. La maîtrise de la distance et des angles est primordiale."
    },
    {
      id: Division.FULL_STRIKING,
      title: "Division de Frappe Totale",
      focus: "Coordination mains + jambes",
      goal: "Développer une capacité de frappe complète en combat debout",
      evaluation: ["Équilibre", "Fluidité", "Portée", "Combinaison"],
      icon: Move,
      description: "Intègre les coups de pied, les genoux et les coudes aux frappes manuelles. Nécessite un équilibre exceptionnel et des transitions fluides entre les portées."
    },
    {
      id: Division.STRIKING_TAKEDOWN,
      title: "Division Frappe & Mise au sol",
      focus: "Transition de la frappe au contrôle",
      goal: "Dominer les phases debout et de mise au sol",
      evaluation: ["Timing", "Entrée", "Contrôle", "Exécution"],
      icon: Activity,
      description: "Le pont entre le debout et le sol. Se concentre sur le 'shoot' et la transition intelligente de la frappe à la lutte."
    },
    {
      id: Division.GROUND_FIGHTING,
      title: "Division de Combat au Sol",
      focus: "Contrôle, soumission, positionnement",
      goal: "Maîtriser la dominance au sol et les techniques de finition",
      evaluation: ["Stabilité", "Contrôle", "Soumission", "Défense"],
      icon: Shield,
      description: "Maîtrise du plan horizontal. Se concentre sur l'effet de levier, la pression et l'application technique des soumissions."
    },
    {
      id: Division.MIXED_COMBAT,
      title: "Division de Combat Mixte",
      focus: "Intégration totale de tous les éléments de combat",
      goal: "S'adapter à n'importe quelle situation sans limites",
      evaluation: ["Adaptabilité", "Fluidité", "Décision", "Efficacité"],
      icon: Zap,
      description: "L'expression ultime de TCHUNGU. Intégration transparente de toutes les portées et styles sans frontières artificielles."
    },
    {
      id: Division.GRAPPLING,
      title: "Division de Grappling",
      focus: "Contrôle sans frappe",
      goal: "Neutraliser l'adversaire par le positionnement et l'effet de levier",
      evaluation: ["Grip", "Équilibre", "Contrôle", "Transition"],
      icon: UserCheck,
      description: "Contrôle pur. Utilisation de la physique et de la biomécanique pour neutraliser les menaces sans avoir besoin d'impact."
    },
    {
      id: Division.TACTICAL_DEFENSE,
      title: "Division de Défense Tactique",
      focus: "Scénarios de self-défense réels",
      goal: "Survivre, contrôler et neutraliser les menaces",
      evaluation: ["Conscience", "Réaction", "Efficacité", "Sécurité"],
      icon: Eye,
      description: "Survie dans des environnements à haute pression. Se concentre sur l'évaluation rapide des menaces et la neutralisation efficace."
    },
    {
      id: Division.PERSONAL_PROTECTION,
      title: "Division de Protection Personnelle",
      focus: "Évitement et engagement minimal",
      goal: "Protéger sans escalade",
      evaluation: ["Décision", "Distance", "Fuite", "Conscience"],
      icon: Target,
      description: "La forme de défense la plus élevée est l'évitement. Se concentre sur la désescalade, la conscience environnementale et l'extraction sûre."
    }
  ],
  zh: [
    {
      id: Division.HAND_STRIKING,
      title: "手部打击分区",
      focus: "精度、时机、距离、角度",
      goal: "精通高效且智能的手部打击",
      evaluation: ["技术", "时机", "精度", "控制"],
      icon: Hand,
      description: "专注于拳击艺术和精确的手眼协调。掌握距离和角度至关重要。"
    },
    {
      id: Division.FULL_STRIKING,
      title: "全打击分区",
      focus: "手脚配合",
      goal: "在站立战斗中培养全面的打击能力",
      evaluation: ["平衡", "流畅度", "范围", "组合"],
      icon: Move,
      description: "将踢腿、膝击和肘击与手部打击相结合。需要卓越的平衡和不同范围之间的流畅切换。"
    },
    {
      id: Division.STRIKING_TAKEDOWN,
      title: "打击与抱摔分区",
      focus: "从打击到控制的过渡",
      goal: "统治站立和抱摔阶段",
      evaluation: ["时机", "切入", "控制", "执行"],
      icon: Activity,
      description: "站立与地面之间的桥梁。专注于“下潜(shoot)”以及从打击到摔跤的智能过渡。"
    },
    {
      id: Division.GROUND_FIGHTING,
      title: "地面格斗分区",
      focus: "控制、降服、位置",
      goal: "精通地面统治和终结技术",
      evaluation: ["稳定性", "控制", "降服", "防守"],
      icon: Shield,
      description: "掌握水平面上的战斗。专注于杠杆作用、压力以及降服技的技术应用。"
    },
    {
      id: Division.MIXED_COMBAT,
      title: "综合格斗分区",
      focus: "全面整合所有战斗元素",
      goal: "突破限制，适应任何情况",
      evaluation: ["适应性", "流畅度", "决策", "效率"],
      icon: Zap,
      description: "TCHUNGU 的终极表达。无缝整合所有范围和风格，没有人工界限。"
    },
    {
      id: Division.GRAPPLING,
      title: "缠斗(Grappling)分区",
      focus: "无打击控制",
      goal: "通过位置和杠杆作用使对手失去战斗力",
      evaluation: ["抓握", "平衡", "控制", "转换"],
      icon: UserCheck,
      description: "纯粹的控制。利用物理学和生物力学来中和威胁，无需冲击。"
    },
    {
      id: Division.TACTICAL_DEFENSE,
      title: "战术防御分区",
      focus: "现实世界的自卫场景",
      goal: "生存、控制并中和威胁",
      evaluation: ["觉察", "反应", "效率", "安全"],
      icon: Eye,
      description: "在高压环境中的生存。着重于快速威胁评估和高效中和。"
    },
    {
      id: Division.PERSONAL_PROTECTION,
      title: "个人保护分区",
      focus: "规避和最低程度的介入",
      goal: "保护而不升级冲突",
      evaluation: ["决策", "距离", "逃生", "觉察"],
      icon: Target,
      description: "防守的最佳形式是规避。专注于降级冲突、环境意识和安全撤离。"
    }
  ]
};
