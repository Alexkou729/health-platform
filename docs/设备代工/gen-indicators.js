const fs = require('fs');
const data = require('E:/work Codex/健康管理/platform/docs/设备代工/报告参数对照表.json');

const TITLE_TO_CODE = {
  '综合报告':'comprehensive','专家分析报告':'expert_analysis','手工分析报告':'manual_analysis',
  '基本体质评估报告':'basic_constitution','心脑血管评估报告':'cardiovascular','免疫系统评估报告':'immune_system',
  '胃肠功能评估报告':'gi_function','内分泌系统评估报告':'endocrine','肺功能评估报告':'lung_function',
  '肝功能评估报告':'liver','胆功能评估报告':'gallbladder','胰腺功能评估报告':'pancreas','肾脏功能评估报告':'kidney',
  '脑神经评估报告':'brain_nerve','骨病评估报告':'bone_disease','骨密度评估报告':'bone_density','风湿骨病评估报告':'rheumatism',
  '骨生长指数评估报告':'bone_growth','血糖评估报告':'blood_sugar','微量元素评估报告':'trace_elements',
  '维生素评估报告':'vitamins','氨基酸评估报告':'amino_acid','辅酶评估报告':'coenzyme','人体毒素评估报告':'body_toxin',
  '重金属评估报告':'heavy_metal','过敏评估报告':'allergy','皮肤评估报告':'skin','眼部评估报告':'eye',
  '前列腺评估报告':'prostate','男性性功能评估报告':'male_sexual','精子和精液评估报告':'sperm_semen','经络评估报告':'meridian',
  '肥胖症评估报告':'obesity','胶原蛋白评估报告':'collagen','脉搏与脑血管评估报告':'cervical_vascular','人体成份评估报告':'body_composition',
  '大肠评估评估报告':'large_intestine','甲状腺评估报告':'thyroid','血脂评估报告':'blood_lipid','人体综合免疫力评估报告':'comprehensive_immunity',
  '脂肪酸评估报告':'fatty_acid','人体意识形态评估报告':'consciousness_posture','基本脂肪酸评估报告':'efa','呼吸功能评估报告':'respiratory',
  '荷尔蒙评估报告':'hormone','体液评估报告':'body_fluid','肠道菌群评估报告':'gut_flora','妇科评估报告':'gynecology',
  '乳腺评估报告':'breast','月经周期评估报告':'menstrual',
};

const META = {
  comprehensive:{category:'综合',applicable:['all']},expert_analysis:{category:'综合',applicable:['all']},manual_analysis:{category:'综合',applicable:['all']},
  basic_constitution:{category:'综合',applicable:['all']},cardiovascular:{category:'系统器官',applicable:['all','elderly']},immune_system:{category:'系统器官',applicable:['all']},
  gi_function:{category:'系统器官',applicable:['all']},endocrine:{category:'系统器官',applicable:['all']},lung_function:{category:'系统器官',applicable:['all']},
  liver:{category:'系统器官',applicable:['all']},gallbladder:{category:'系统器官',applicable:['all']},pancreas:{category:'系统器官',applicable:['all']},
  kidney:{category:'系统器官',applicable:['all']},brain_nerve:{category:'系统器官',applicable:['all']},bone_disease:{category:'系统器官',applicable:['all','elderly']},
  bone_density:{category:'系统器官',applicable:['all','elderly']},rheumatism:{category:'专项',applicable:['all','elderly']},bone_growth:{category:'系统器官',applicable:['all','elderly']},
  blood_sugar:{category:'营养',applicable:['all']},trace_elements:{category:'营养',applicable:['all']},vitamins:{category:'营养',applicable:['all']},
  amino_acid:{category:'营养',applicable:['all']},coenzyme:{category:'营养',applicable:['all']},body_toxin:{category:'风险',applicable:['all']},
  heavy_metal:{category:'风险',applicable:['all']},allergy:{category:'系统器官',applicable:['all']},skin:{category:'专项',applicable:['all','female']},
  eye:{category:'系统器官',applicable:['all']},prostate:{category:'男性',applicable:['male']},male_sexual:{category:'男性',applicable:['male']},
  sperm_semen:{category:'男性',applicable:['male']},meridian:{category:'专项',applicable:['all']},obesity:{category:'专项',applicable:['all']},
  collagen:{category:'体成分',applicable:['female','elderly']},cervical_vascular:{category:'系统器官',applicable:['all','elderly']},body_composition:{category:'体成分',applicable:['all']},
  large_intestine:{category:'系统器官',applicable:['all']},thyroid:{category:'体成分',applicable:['all']},blood_lipid:{category:'营养',applicable:['all','elderly']},
  comprehensive_immunity:{category:'专项',applicable:['all']},fatty_acid:{category:'营养',applicable:['all']},consciousness_posture:{category:'体成分',applicable:['all']},
  efa:{category:'营养',applicable:['all']},respiratory:{category:'系统器官',applicable:['all']},hormone:{category:'系统器官',applicable:['all']},
  body_fluid:{category:'体成分',applicable:['all']},gut_flora:{category:'专项',applicable:['all']},gynecology:{category:'女性',applicable:['female']},
  breast:{category:'女性',applicable:['female']},menstrual:{category:'女性',applicable:['female']},
};

const templates = [];
let unmapped = [];
for (const r of data) {
  const title = r.title || r.file.replace(/\.html$/i,'');
  const code = TITLE_TO_CODE[title];
  if (!code) { unmapped.push(title); continue; }
  const meta = META[code] || { category:'其他', applicable:['all'] };
  const indicators = (r.items||[]).map(it => ({ name: it.name, range: it.range || '' }));
  templates.push({ code, name: title, category: meta.category, applicable: meta.applicable, indicators });
}

const out = `// 由原软件 ReportC 完整复刻的检测指标库（自动生成）
export interface IndicatorDef { name: string; range: string; }
export interface ReportTemplateDef {
  code: string;
  name: string;
  category: string;
  applicable: string[];
  indicators: IndicatorDef[];
}
export const REPORT_TEMPLATES: ReportTemplateDef[] = ${JSON.stringify(templates, null, 2)};
`;

fs.writeFileSync('E:/work Codex/健康管理/platform/apps/backend/src/modules/report/report-indicators.data.ts', out, 'utf8');
let totalInd = 0; templates.forEach(t => totalInd += t.indicators.length);
console.log('✅ 已生成 report-indicators.data.ts | 模板', templates.length, '类 | 指标', totalInd, '项');
if (unmapped.length) console.log('未映射:', unmapped.join(', '));
