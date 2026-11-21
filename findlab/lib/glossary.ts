/**
 * Korean → English research terms, so Korean words match English lab data ("단백질" ↔ "protein").
 *
 * Lab records from DGIST Scholar are mostly English; students often write in Korean. Before
 * keyword matching, `expandKo()` appends the English term for every Korean term it finds,
 * on both sides (student text and lab text), so the two meet in English.
 *
 * Keys are matched as substrings (Korean attaches particles: "단백질을", "로봇에"), except
 * one-syllable keys, which must stand alone so "암" doesn't fire inside "암기".
 * Add terms freely — longer keys are checked first.
 */
export const KO_EN: Record<string, string> = {
  // ---- Biology / medicine ----
  단백질체: "proteomics protein", 단백질: "protein", 펩타이드: "peptide", 효소: "enzyme", 항체: "antibody", 아미노산: "amino acid",
  유전체: "genome genomics", 유전자: "gene genetic", 유전학: "genetics", 전사체: "transcriptome transcription", 전사인자: "transcription factor",
  후성유전: "epigenetic", 염색체: "chromosome", 디엔에이: "dna", 알엔에이: "rna", 시퀀싱: "sequencing", 크리스퍼: "crispr", 유전자가위: "crispr gene editing",
  유전자편집: "gene editing crispr", 세포생물학: "cell biology", 줄기세포: "stem cell", 세포: "cell cellular", 조직: "tissue", 오가노이드: "organoid",
  미토콘드리아: "mitochondria", 막단백질: "membrane protein", 세포막: "membrane", 구조생물학: "structural biology", 구조: "structure structural", 생물물리: "biophysics",
  분자생물학: "molecular biology", 생화학: "biochemistry", 생명과학: "life science biology", 생물학: "biology", 생물정보학: "bioinformatics",
  미생물: "microbe microbial bacteria", 세균: "bacteria bacterial", 박테리아: "bacteria", 바이러스: "virus viral", 면역: "immune immunology", 염증: "inflammation",
  노화: "aging", 대사: "metabolism metabolic", 질병: "disease", 질환: "disease", 암세포: "cancer tumor", 항암: "cancer anticancer", 종양: "tumor cancer",
  치매: "dementia alzheimer", 알츠하이머: "alzheimer", 파킨슨: "parkinson", 당뇨: "diabetes", 비만: "obesity", 심혈관: "cardiovascular",
  신약: "drug discovery", 약물: "drug", 약물전달: "drug delivery", 진단: "diagnosis diagnostic", 치료: "therapy therapeutic treatment", 의료: "medical clinical",
  의학: "medicine medical", 의생명: "biomedical", 바이오: "bio biomedical", 헬스케어: "healthcare health", 건강: "health", 재활: "rehabilitation",
  바이오센서: "biosensor", 식물: "plant", 동물: "animal", 마우스: "mouse", 초파리: "drosophila fly", 선충: "elegans nematode", 제브라피시: "zebrafish",
  // ---- Brain / cognition ----
  뇌과학: "brain neuroscience", 신경과학: "neuroscience neural", 신경망: "neural network", 신경세포: "neuron neuronal", 뉴런: "neuron", 신경: "neural neuro nerve",
  시냅스: "synapse synaptic", 뇌파: "eeg brain signal", 뇌영상: "brain imaging fmri", 기억: "memory", 학습: "learning", 수면: "sleep", 감각: "sensory",
  후각: "olfaction olfactory", 시각: "visual vision", 청각: "auditory", 통증: "pain", 행동: "behavior", 인지: "cognitive cognition", 감정: "emotion",
  심리: "psychology", 뇌질환: "brain disease neurological", 뇌: "brain",
  // ---- AI / computing ----
  인공지능: "artificial intelligence ai", 머신러닝: "machine learning", 기계학습: "machine learning", 딥러닝: "deep learning", 강화학습: "reinforcement learning",
  컴퓨터비전: "computer vision", "컴퓨터 비전": "computer vision", 영상처리: "image processing", 이미지: "image", 영상: "image imaging video",
  자연어처리: "natural language processing nlp", 자연어: "natural language", 언어모델: "language model llm", 생성형: "generative", 추천: "recommendation",
  데이터: "data", 빅데이터: "big data", 데이터분석: "data analysis", 통계: "statistics statistical", 확률: "probability", 최적화: "optimization",
  알고리즘: "algorithm", 그래프: "graph", 시뮬레이션: "simulation", 모델링: "modeling", 소프트웨어: "software", 하드웨어: "hardware", 코딩: "programming software coding",
  프로그래밍: "programming", 파이썬: "python", 컴퓨터: "computer computing", 컴퓨팅: "computing", 병렬: "parallel", 분산: "distributed", 클라우드: "cloud",
  네트워크: "network", 통신: "communication wireless", 무선: "wireless", 이동통신: "mobile communication", 사물인터넷: "iot internet of things",
  임베디드: "embedded", 운영체제: "operating system", 보안: "security", 암호: "cryptography encryption", 블록체인: "blockchain", 개인정보: "privacy",
  양자컴퓨팅: "quantum computing", 양자: "quantum", 그래픽스: "graphics", 가상현실: "virtual reality vr", 증강현실: "augmented reality ar", 메타버스: "metaverse",
  인간컴퓨터상호작용: "human computer interaction hci", 웹: "web", 앱: "app mobile",
  // ---- Robotics / mechanics / mobility ----
  로봇공학: "robotics robot", 로봇: "robot robotics", 로보틱스: "robotics", 소프트로봇: "soft robot", 마이크로로봇: "microrobot", 수술로봇: "surgical robot",
  로봇팔: "robot arm manipulator", 매니퓰레이터: "manipulator", 외골격: "exoskeleton", 웨어러블: "wearable", 보행: "locomotion walking gait", 휴머노이드: "humanoid",
  드론: "drone uav", 자율주행: "autonomous driving vehicle", 자동차: "vehicle automotive", 차량: "vehicle", 모빌리티: "mobility", 라이다: "lidar", 레이더: "radar",
  제어: "control", 기구학: "kinematics", 동역학: "dynamics", 햅틱: "haptic", 촉각: "tactile haptic", 액추에이터: "actuator", 구동기: "actuator", 모터: "motor",
  센서: "sensor sensing", 메카트로닉스: "mechatronics", 기계: "mechanical", 제조: "manufacturing", 스마트팩토리: "smart factory manufacturing",
  인간로봇상호작용: "human robot interaction", 경로계획: "path planning", 위치추정: "localization slam",
  // ---- Electronics / semiconductors ----
  반도체: "semiconductor", 소자: "device", 트랜지스터: "transistor", 메모리: "memory", 뉴로모픽: "neuromorphic", 집적회로: "integrated circuit",
  회로: "circuit", 칩: "chip", 디스플레이: "display", 발광: "light emitting led", 엘이디: "led", 광소자: "optoelectronic photonic", 광전자: "optoelectronic",
  신호처리: "signal processing", 신호: "signal", 전력: "power", 전자: "electronic", 전기: "electrical", 안테나: "antenna", 초음파: "ultrasound ultrasonic",
  // ---- Energy / materials / chemistry / physics ----
  배터리: "battery", 이차전지: "battery secondary", 리튬: "lithium", 전고체: "solid state", 전해질: "electrolyte", 전극: "electrode", 양극: "cathode", 음극: "anode",
  연료전지: "fuel cell", 수소: "hydrogen", 태양전지: "solar cell photovoltaic", 태양광: "solar photovoltaic", 페로브스카이트: "perovskite", 열전: "thermoelectric",
  에너지: "energy", 에너지하베스팅: "energy harvesting", 촉매: "catalyst catalysis", 광촉매: "photocatalyst photocatalysis", 전기화학: "electrochemistry electrochemical",
  이산화탄소: "co2 carbon dioxide", 탄소: "carbon", 환경: "environment environmental", 수처리: "water treatment", 오염: "pollution",
  소재: "material", 재료: "material", 신소재: "advanced material", 나노: "nano nanomaterial", 나노소재: "nanomaterial", 그래핀: "graphene", 고분자: "polymer",
  박막: "thin film", 금속: "metal", 세라믹: "ceramic", 복합재: "composite", 유기: "organic", 무기: "inorganic", 결정: "crystal", "2차원": "2d two dimensional",
  화학: "chemistry chemical", 합성: "synthesis", 유기화학: "organic chemistry", 분석화학: "analytical chemistry", 물리: "physics", 물리학: "physics",
  광학: "optics optical", 레이저: "laser", 분광: "spectroscopy", 현미경: "microscopy microscope", 이미징: "imaging", 자성: "magnetic magnetism", 스핀: "spin",
  초전도: "superconductor superconductivity", 플라즈마: "plasma", 열: "thermal heat", 유체: "fluid", 표면: "surface", 계면: "interface",
  // ---- Math / management / others ----
  수학: "mathematics", 기술경영: "technology management", 경영: "management", 혁신: "innovation", 정책: "policy", 교육: "education", 경제: "economics",
  // ---- Single syllables (must stand alone) ----
  암: "cancer", 빛: "light optical", 물: "water",
};

const ONE_SYLLABLE_PARTICLES = "(?:을|를|이|가|은|는|의|에|과|와|도|만|으로|로)?";
const KEYS = Object.keys(KO_EN).sort((a, b) => b.length - a.length);
const PATTERNS = KEYS.map((k) => ({
  key: k,
  re: [...k].length === 1 ? new RegExp(`(?:^|[\\s,.;:/()+·-])${k}${ONE_SYLLABLE_PARTICLES}(?=$|[\\s,.;:/()+·-])`) : null,
}));

/** Korean terms found in the text, with their English equivalents (longest terms first, no overlaps). */
export function glossaryHits(text: string): { ko: string; en: string }[] {
  let rest = text;
  const hits: { ko: string; en: string }[] = [];
  for (const { key, re } of PATTERNS) {
    if (re ? re.test(rest) : rest.includes(key)) {
      hits.push({ ko: key, en: KO_EN[key] });
      rest = rest.split(key).join(" "); // so "단백질체" doesn't also count "단백질"
    }
  }
  return hits;
}

/** The text plus the English equivalents of its Korean research terms. */
export function expandKo(text: string): string {
  if (!/[가-힣]/.test(text)) return text;
  const hits = glossaryHits(text);
  return hits.length ? `${text} ${hits.map((h) => h.en).join(" ")}` : text;
}

/** English word → the Korean term it came from (for showing "protein(단백질)"). */
export function koFor(enToken: string, hits: { ko: string; en: string }[]): string | null {
  const t = enToken.toLowerCase();
  return hits.find((h) => h.en.split(/\s+/).some((w) => w.replace(/s$/, "") === t || w === t))?.ko ?? null;
}
