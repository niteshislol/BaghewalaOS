import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'hi' | 'wg';
type Theme = 'dark' | 'light';

interface SettingsState {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    'nav.overview': 'Overview',
    'nav.field': 'Field Dashboard',
    'nav.well': 'Well Overview',
    'nav.alerts': 'Alerts & Safety',
    'nav.physics': 'Physics Twin',
    'nav.reservoir': 'Reservoir & Thermal',
    'nav.wellbore': 'Wellbore Hydrodynamics',
    'nav.srp': 'SRP Dynamometer',
    'nav.visualizer': 'Live Visualizer',
    'nav.optimization': 'Optimization',
    'nav.css': 'CSS Optimizer',
    'nav.whatif': 'What-If Sandbox',
    'nav.horizon': 'Horizon Simulator',
    'nav.ai': 'AI & Intelligence',
    'nav.copilot': 'AI Copilot',
    'nav.economics': 'Economics & ROI',
    'nav.maintenance': 'Predictive Maintenance',
    'nav.operations': 'Operations',
    'nav.trends': 'Trends & History',
    'nav.workorders': 'Work Orders',
    'nav.audit': 'Audit & Compliance',
    'nav.models': 'ML Model Metrics',
    'status.live': 'LIVE TWIN ACTIVE',
    'status.engine': 'Physics Engine: OPERATIONAL',
    'btn.demo': 'Start Guided Tour',
  },
  hi: {
    'nav.overview': 'अवलोकन (Overview)',
    'nav.field': 'फील्ड डैशबोर्ड (Field)',
    'nav.well': 'कुआँ अवलोकन (Well)',
    'nav.alerts': 'चेतावनी व सुरक्षा (Alerts)',
    'nav.physics': 'भौतिकी मॉडल (Physics Twin)',
    'nav.reservoir': 'जलाशय व थर्मल (Reservoir)',
    'nav.wellbore': 'वेलबोर (Wellbore)',
    'nav.srp': 'एस.आर.पी पम्प (SRP)',
    'nav.visualizer': 'लाइव विज़ुअलाइज़र (Visualizer)',
    'nav.optimization': 'अनुकूलन (Optimization)',
    'nav.css': 'सी.एस.एस. अनुकूलक (CSS)',
    'nav.whatif': 'अनुमान परीक्षण (What-If)',
    'nav.horizon': 'भविष्यवक्ता (Horizon)',
    'nav.ai': 'कृत्रिम बुद्धिमत्ता (AI)',
    'nav.copilot': 'ए.आई. सहायक (Copilot)',
    'nav.economics': 'अर्थशास्त्र (Economics)',
    'nav.maintenance': 'रखरखाव (Maintenance)',
    'nav.operations': 'संचालन (Operations)',
    'nav.trends': 'प्रवृत्तियां (Trends)',
    'nav.workorders': 'कार्य आदेश (Work Orders)',
    'nav.audit': 'ऑडिट (Audit)',
    'nav.models': 'मॉडल मेट्रिक्स (Models)',
    'status.live': 'सक्रिय ट्विन (LIVE)',
    'status.engine': 'भौतिकी इंजन: चालू',
    'btn.demo': 'गाइड टूर शुरू करें',
  },
  wg: {
    'nav.overview': 'निगरानी (Nigrani)',
    'nav.field': 'खेत रो डेशबोर्ड (Khet)',
    'nav.well': 'कुआँ री निजर (Kuaan)',
    'nav.alerts': 'चेतावणी अर बचाव (Chetawni)',
    'nav.physics': 'जुड़वां मॉडल (Physics Twin)',
    'nav.reservoir': 'पाताल रा हालात (Reservoir)',
    'nav.wellbore': 'खाडो अर बहाव (Wellbore)',
    'nav.srp': 'मशीन रो जोर (SRP)',
    'nav.visualizer': 'चालती मशीन (Visualizer)',
    'nav.optimization': 'सुधार (Sudhaar)',
    'nav.css': 'भाप रो सुधार (CSS)',
    'nav.whatif': 'कांई वेला? (What-If)',
    'nav.horizon': 'आगलो टैम (Horizon)',
    'nav.ai': 'समझदार मशीन (AI)',
    'nav.copilot': 'आपरो साती (Copilot)',
    'nav.economics': 'पिया रा लेखा (Economics)',
    'nav.maintenance': 'मरम्मत (Marammat)',
    'nav.operations': 'काम-काज (Kaam-Kaaj)',
    'nav.trends': 'पुराणो ब्यौरो (Trends)',
    'nav.workorders': 'काम रा हुकुम (Work Orders)',
    'nav.audit': 'जांच-पड़ताल (Jaanch)',
    'nav.models': 'मॉडल री परख (Models)',
    'status.live': 'जुड़वां चालै है (LIVE)',
    'status.engine': 'इंजन: चालू है',
    'btn.demo': 'सैर सरू करो',
  }
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      language: 'en',
      setTheme: (theme) => {
        set({ theme });
        if (theme === 'light') {
          document.documentElement.classList.add('light-mode');
        } else {
          document.documentElement.classList.remove('light-mode');
        }
      },
      setLanguage: (language) => set({ language }),
      t: (key) => {
        const lang = get().language;
        return TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key] || key;
      },
    }),
    {
      name: 'wagheraos-settings',
    }
  )
);
