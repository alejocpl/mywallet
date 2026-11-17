/**
 * Encuesta inicial única (Onboarding) de MyWallet.
 * Se presenta automáticamente la primera vez que se abre la aplicación para
 * configurar ingresos, gastos (con soporte de subcategorías y frecuencia mensual),
 * deudas y metas de ahorro. Una vez completada, se bloquea y desaparece para
 * evitar duplicidades o alteraciones accidentales en los datos ya guardados.
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  CreditCard,
  Home,
  Laptop,
  Layers,
  PiggyBank,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { FormattedNumberInput } from '../../components/ui/FormattedNumberInput';
import { COLOR_PALETTE } from '../../config/icons';
import { useWallet } from '../../context/WalletContext';
import {
  onboardingApi,
  type ExpenseRecordingMode,
  type OnboardingDebtItem,
  type OnboardingEssentialItem,
  type OnboardingGoalItem,
  type OnboardingSubcategoryItem,
} from '../../services/api';
import { formatMoney, monthLabel } from '../../utils/format';

type EssentialKey =
  | 'housing'
  | 'food'
  | 'transport'
  | 'utilities'
  | 'health'
  | 'education';

type ExpenseFieldKey =
  | EssentialKey
  | 'leisure'
  | 'dining'
  | 'subscriptions'
  | 'shopping'
  | 'investments';

interface DraftEssentialPlan {
  unitAmount: string;
  frequencyMonth: string;
  paidStatus: 'pending' | 'paid' | 'partial';
  paidCount: string;
  paidAmountOverride: string;
}

interface DraftSubcategory {
  id: string;
  name: string;
  unitAmount: string;
  frequencyMonth: string;
}

interface DraftDebt {
  id: string;
  name: string;
  creditor: string;
  totalAmount: string;
  remainingAmount: string;
  interestRate: string;
  monthlyPayment: string;
  dueDay: string;
}

interface DraftGoal {
  id: string;
  name: string;
  targetAmount: string;
  currentSaved: string;
  monthlyContribution: string;
  deadline: string;
  icon: string;
  color: string;
}

const STEPS = [
  { id: 1, title: 'Ingresos', subtitle: 'Sueldo, freelance y otros' },
  { id: 2, title: 'Esenciales', subtitle: 'Vivienda, comida y servicios' },
  { id: 3, title: 'Estilo de vida', subtitle: 'Ocio, salidas y suscripciones' },
  { id: 4, title: 'Deudas', subtitle: 'Créditos y tarjetas' },
  { id: 5, title: 'Metas', subtitle: 'Objetivos de ahorro' },
  { id: 6, title: 'Resumen', subtitle: 'Tu plan financiero' },
] as const;

const ESSENTIAL_KEYS: EssentialKey[] = [
  'housing',
  'food',
  'transport',
  'utilities',
  'health',
  'education',
];

const ESSENTIAL_META: {
  key: EssentialKey;
  question: string;
  hint: string;
  placeholder: string;
  subPlaceholder: string;
  isVariable: boolean;
}[] = [
  {
    key: 'housing',
    question: '¿Cuánto se paga de vivienda?',
    hint: 'Arriendo, hipoteca o administración',
    placeholder: 'Ej. 1,400,000',
    subPlaceholder: 'Ej. Arriendo / Administración',
    isVariable: false,
  },
  {
    key: 'food',
    question: '¿Cuánto pagas en alimentación?',
    hint: 'Mercado, supermercado o loncheras (valor variable al hacer check)',
    placeholder: 'Ej. 400,000',
    subPlaceholder: 'Ej. Mercado quincenal',
    isVariable: true,
  },
  {
    key: 'transport',
    question: '¿Cuánto gastas en transporte?',
    hint: 'Gasolina, pasajes, taxis (valor variable al hacer check)',
    placeholder: 'Ej. 70,000',
    subPlaceholder: 'Ej. Tanqueada / Pasajes semana',
    isVariable: true,
  },
  {
    key: 'utilities',
    question: '¿Cuánto pagas en servicios?',
    hint: 'Energía, agua, gas, internet (valor variable al hacer check)',
    placeholder: 'Ej. 320,000',
    subPlaceholder: 'Ej. Internet / Energía / Agua',
    isVariable: true,
  },
  {
    key: 'health',
    question: '¿Cuánto destinas a salud?',
    hint: 'EPS, medicina prepagada o farmacia',
    placeholder: 'Ej. 150,000',
    subPlaceholder: 'Ej. Prepagada / Medicamentos',
    isVariable: false,
  },
  {
    key: 'education',
    question: '¿Cuánto inviertes en educación?',
    hint: 'Colegio, universidad, cursos o libros',
    placeholder: 'Ej. 250,000',
    subPlaceholder: 'Ej. Curso inglés / Matrícula',
    isVariable: false,
  },
];

const createEmptyEssential = (): DraftEssentialPlan => ({
  unitAmount: '',
  frequencyMonth: '1',
  paidStatus: 'pending',
  paidCount: '1',
  paidAmountOverride: '',
});

const LIFESTYLE_KEYS: ExpenseFieldKey[] = [
  'leisure',
  'dining',
  'subscriptions',
  'shopping',
];

const STEP3_KEYS: ExpenseFieldKey[] = [...LIFESTYLE_KEYS, 'investments'];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const num = (v: string): number => {
  const parsed = Number(v);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const freqInt = (v: string): number => {
  const parsed = Math.floor(Number(v));
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
};

const subMonthlyTotal = (s: DraftSubcategory): number =>
  num(s.unitAmount) * freqInt(s.frequencyMonth);

const createEmptySubcategory = (name = '', unitAmount = '', frequencyMonth = '1'): DraftSubcategory => ({
  id: uid(),
  name,
  unitAmount,
  frequencyMonth,
});

const createEmptyDebt = (name = ''): DraftDebt => ({
  id: uid(),
  name,
  creditor: '',
  totalAmount: '',
  remainingAmount: '',
  interestRate: '18',
  monthlyPayment: '',
  dueDay: '',
});

const createEmptyGoal = (
  name = '',
  icon = 'piggy-bank',
  color: string = COLOR_PALETTE[0],
): DraftGoal => ({
  id: uid(),
  name,
  targetAmount: '',
  currentSaved: '0',
  monthlyContribution: '',
  deadline: '',
  icon,
  color,
});

export function OnboardingWizard() {
  const { month, refreshAll, setView, notify } = useWallet();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paso 1: Ingresos
  const [salary, setSalary] = useState('');
  const [hasFreelance, setHasFreelance] = useState<boolean>(false);
  const [freelance, setFreelance] = useState('');
  const [hasOtherIncome, setHasOtherIncome] = useState<boolean>(false);
  const [otherIncome, setOtherIncome] = useState('');
  const [otherIncomeDesc, setOtherIncomeDesc] = useState('');

  // Paso 2 y 3: Montos directos y subcategorías por categoría
  const [expenses, setExpenses] = useState<Record<ExpenseFieldKey, string>>({
    housing: '',
    food: '',
    transport: '',
    utilities: '',
    health: '',
    education: '',
    leisure: '',
    dining: '',
    subscriptions: '',
    shopping: '',
    investments: '',
  });
  const [subcategories, setSubcategories] = useState<Record<ExpenseFieldKey, DraftSubcategory[]>>({
    housing: [],
    food: [],
    transport: [],
    utilities: [],
    health: [],
    education: [],
    leisure: [],
    dining: [],
    subscriptions: [],
    shopping: [],
    investments: [],
  });
  const [essentialPlans, setEssentialPlans] = useState<Record<EssentialKey, DraftEssentialPlan>>({
    housing: createEmptyEssential(),
    food: createEmptyEssential(),
    transport: createEmptyEssential(),
    utilities: createEmptyEssential(),
    health: createEmptyEssential(),
    education: createEmptyEssential(),
  });
  const [recordingMode, setRecordingMode] = useState<ExpenseRecordingMode>('all');

  // Paso 4: Deudas
  const [hasDebts, setHasDebts] = useState<boolean>(false);
  const [debtsList, setDebtsList] = useState<DraftDebt[]>([]);

  // Paso 5: Metas
  const [hasGoals, setHasGoals] = useState<boolean>(false);
  const [goalsList, setGoalsList] = useState<DraftGoal[]>([]);

  const setExpenseField = (key: ExpenseFieldKey, value: string) => {
    setExpenses((prev) => ({ ...prev, [key]: value }));
  };

  const updateEssentialPlan = (key: EssentialKey, patch: Partial<DraftEssentialPlan>) => {
    setEssentialPlans((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const addSubcategory = (key: ExpenseFieldKey, defaultName = '') => {
    setSubcategories((prev) => ({
      ...prev,
      [key]: [...prev[key], createEmptySubcategory(defaultName)],
    }));
  };

  const updateSubcategory = (
    key: ExpenseFieldKey,
    subId: string,
    patch: Partial<DraftSubcategory>,
  ) => {
    setSubcategories((prev) => ({
      ...prev,
      [key]: prev[key].map((item) => (item.id === subId ? { ...item, ...patch } : item)),
    }));
  };

  const removeSubcategory = (key: ExpenseFieldKey, subId: string) => {
    setSubcategories((prev) => ({
      ...prev,
      [key]: prev[key].filter((item) => item.id !== subId),
    }));
  };

  const effectiveExpense = (key: ExpenseFieldKey): number => {
    const subs = subcategories[key];
    if (subs.length > 0) {
      return subs.reduce((sum, s) => sum + subMonthlyTotal(s), 0);
    }
    return num(expenses[key]);
  };

  const effectiveEssentialStats = (key: EssentialKey) => {
    const subs = subcategories[key];
    const plan = essentialPlans[key];
    const unit =
      subs.length > 0
        ? subs.reduce((sum, s) => sum + subMonthlyTotal(s), 0)
        : num(plan.unitAmount);
    const freq = subs.length > 0 ? 1 : freqInt(plan.frequencyMonth);
    const monthly = unit * freq;

    let paidCount = 0;
    if (unit > 0) {
      if (plan.paidStatus === 'paid') paidCount = freq;
      else if (plan.paidStatus === 'partial') {
        paidCount = Math.min(freq, Math.max(0, Math.floor(Number(plan.paidCount) || 0)));
      }
    }
    const override = num(plan.paidAmountOverride);
    const paidAmount = paidCount * (override > 0 ? override : unit);
    return { unit, freq, monthly, paidCount, paidAmount };
  };

  // Cálculos en tiempo real para el resumen final.
  const preview = useMemo(() => {
    const totalIncome =
      num(salary) +
      (hasFreelance ? num(freelance) : 0) +
      (hasOtherIncome ? num(otherIncome) : 0);

    const lifestyleTotal = (key: ExpenseFieldKey): number => {
      const subs = subcategories[key];
      if (subs.length > 0) return subs.reduce((s, item) => s + subMonthlyTotal(item), 0);
      return num(expenses[key]);
    };

    let needs = 0;
    let essentialsPaid = 0;
    for (const key of ESSENTIAL_KEYS) {
      const subs = subcategories[key];
      const plan = essentialPlans[key];
      const unit =
        subs.length > 0
          ? subs.reduce((sum, s) => sum + subMonthlyTotal(s), 0)
          : num(plan.unitAmount);
      const freq = subs.length > 0 ? 1 : freqInt(plan.frequencyMonth);
      needs += unit * freq;

      let paidCount = 0;
      if (unit > 0) {
        if (plan.paidStatus === 'paid') paidCount = freq;
        else if (plan.paidStatus === 'partial') {
          paidCount = Math.min(freq, Math.max(0, Math.floor(Number(plan.paidCount) || 0)));
        }
      }
      const override = num(plan.paidAmountOverride);
      essentialsPaid += paidCount * (override > 0 ? override : unit);
    }

    const wants = LIFESTYLE_KEYS.reduce((sum, key) => sum + lifestyleTotal(key), 0);
    const investmentsTotal = lifestyleTotal('investments');
    const lifestyleFixed = lifestyleTotal('subscriptions');
    const lifestyleRecorded =
      recordingMode === 'all'
        ? wants + investmentsTotal
        : recordingMode === 'fixed_only'
          ? lifestyleFixed
          : 0;

    const recordedExpenses = essentialsPaid + lifestyleRecorded;

    const monthlyDebtPayments = hasDebts
      ? debtsList.reduce((sum, d) => sum + num(d.monthlyPayment), 0)
      : 0;
    const totalDebtBalance = hasDebts
      ? debtsList.reduce(
          (sum, d) =>
            sum + (d.remainingAmount !== '' ? num(d.remainingAmount) : num(d.totalAmount)),
          0,
        )
      : 0;

    const monthlySavings = hasGoals
      ? goalsList.reduce((sum, g) => sum + num(g.monthlyContribution), 0)
      : 0;

    const totalSubcategories = Object.values(subcategories).reduce(
      (sum, list) => sum + list.length,
      0,
    );

    const estimatedAvailable = totalIncome - recordedExpenses - monthlySavings;

    return {
      totalIncome,
      needs,
      wants,
      totalBudgeted: needs + wants + investmentsTotal + monthlyDebtPayments,
      recordedExpenses,
      monthlyDebtPayments,
      totalDebtBalance,
      monthlySavings,
      totalSubcategories,
      estimatedAvailable,
    };
  }, [
    salary,
    hasFreelance,
    freelance,
    hasOtherIncome,
    otherIncome,
    expenses,
    subcategories,
    essentialPlans,
    recordingMode,
    hasDebts,
    debtsList,
    hasGoals,
    goalsList,
  ]);

  function validateExpenseKeys(keys: ExpenseFieldKey[]): boolean {
    for (const key of keys) {
      for (const sub of subcategories[key]) {
        if (!sub.name.trim() || num(sub.unitAmount) <= 0 || freqInt(sub.frequencyMonth) < 1) {
          setError(
            'Completa el nombre, el valor en COP y las veces al mes de cada subcategoría agregada (o elimínala).',
          );
          return false;
        }
      }
    }
    return true;
  }

  function validateStep(currentStep: number): boolean {
    setError(null);
    if (currentStep === 2) return validateExpenseKeys(ESSENTIAL_KEYS);
    if (currentStep === 3) return validateExpenseKeys(STEP3_KEYS);

    if (currentStep === 4 && hasDebts) {
      if (debtsList.length === 0) {
        setError('Agrega al menos una deuda o selecciona "No tengo deudas".');
        return false;
      }
      for (const d of debtsList) {
        if (!d.name.trim() || num(d.totalAmount) <= 0) {
          setError('Cada deuda debe tener un nombre y un monto total mayor a 0.');
          return false;
        }
        const rem = d.remainingAmount !== '' ? Number(d.remainingAmount) : num(d.totalAmount);
        if (rem > num(d.totalAmount)) {
          setError(`El saldo pendiente de "${d.name}" no puede superar el monto total.`);
          return false;
        }
      }
    }

    if (currentStep === 5 && hasGoals) {
      if (goalsList.length === 0) {
        setError('Agrega al menos una meta de ahorro o selecciona "Por ahora no".');
        return false;
      }
      for (const g of goalsList) {
        if (!g.name.trim() || num(g.targetAmount) <= 0) {
          setError('Cada meta debe tener un nombre y un monto objetivo mayor a 0.');
          return false;
        }
      }
    }
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(STEPS.length, s + 1));
  }

  function prevStep() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleFinish() {
    if (
      !validateStep(2) ||
      !validateStep(3) ||
      !validateStep(4) ||
      !validateStep(5)
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formattedDebts: OnboardingDebtItem[] = hasDebts
        ? debtsList.map((d) => ({
            name: d.name.trim(),
            creditor: d.creditor.trim(),
            totalAmount: num(d.totalAmount),
            remainingAmount:
              d.remainingAmount !== '' ? Number(d.remainingAmount) : num(d.totalAmount),
            interestRate: Number(d.interestRate) || 0,
            monthlyPayment: num(d.monthlyPayment),
            dueDay: d.dueDay ? Number(d.dueDay) : null,
          }))
        : [];

      const formattedGoals: OnboardingGoalItem[] = hasGoals
        ? goalsList.map((g) => ({
            name: g.name.trim(),
            targetAmount: num(g.targetAmount),
            currentSaved: num(g.currentSaved),
            monthlyContribution: num(g.monthlyContribution),
            deadline: g.deadline || null,
            icon: g.icon,
            color: g.color,
          }))
        : [];

      const formattedSubcategories: Record<string, OnboardingSubcategoryItem[]> = {};
      for (const key of [...ESSENTIAL_KEYS, ...STEP3_KEYS]) {
        if (subcategories[key].length > 0) {
          formattedSubcategories[key] = subcategories[key].map((s) => ({
            name: s.name.trim(),
            unitAmount: num(s.unitAmount),
            frequencyMonth: freqInt(s.frequencyMonth),
          }));
        }
      }

      const formattedEssentialPlans: Record<string, OnboardingEssentialItem> = {};
      for (const key of ESSENTIAL_KEYS) {
        const stats = effectiveEssentialStats(key);
        if (stats.unit > 0) {
          const override = num(essentialPlans[key].paidAmountOverride);
          formattedEssentialPlans[key] = {
            unitAmount: stats.unit,
            frequencyMonth: stats.freq,
            paidCount: stats.paidCount,
            ...(override > 0 && stats.paidCount > 0 ? { paidAmountOverride: override } : {}),
          };
        }
      }

      await onboardingApi.submit({
        month,
        resetExisting: true,
        expenseRecordingMode: recordingMode,
        incomes: {
          salary: num(salary),
          hasFreelance,
          freelance: hasFreelance ? num(freelance) : 0,
          hasOtherIncome,
          otherIncome: hasOtherIncome ? num(otherIncome) : 0,
          otherIncomeDescription: otherIncomeDesc.trim() || 'Otros ingresos',
        },
        expenses: {
          housing: effectiveEssentialStats('housing').monthly,
          food: effectiveEssentialStats('food').monthly,
          transport: effectiveEssentialStats('transport').monthly,
          utilities: effectiveEssentialStats('utilities').monthly,
          health: effectiveEssentialStats('health').monthly,
          education: effectiveEssentialStats('education').monthly,
          leisure: effectiveExpense('leisure'),
          dining: effectiveExpense('dining'),
          subscriptions: effectiveExpense('subscriptions'),
          shopping: effectiveExpense('shopping'),
          investments: effectiveExpense('investments'),
        },
        subcategories: formattedSubcategories,
        essentialPlans: formattedEssentialPlans,
        hasDebts,
        debts: formattedDebts,
        hasGoals,
        goals: formattedGoals,
      });

      await refreshAll();
      setView('dashboard');
      notify(
        '¡Tu perfil financiero está listo!',
        `Organizamos tus ingresos, presupuestos, subcategorías y metas para ${monthLabel(month)}.`,
        'success',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar tu configuración');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-card">
        {/* Header de bienvenida inicial */}
        <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BrandLogo showTagline />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-[11px] font-semibold text-brand-700">
              <Sparkles size={13} />
              Configuración inicial única · COP
            </span>
          </div>

          {/* Indicador de pasos */}
          <div className="mt-5 grid grid-cols-6 gap-2">
            {STEPS.map((s) => {
              const active = s.id === step;
              const done = s.id < step;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id < step || validateStep(step)) setStep(s.id);
                  }}
                  className="text-left focus:outline-none"
                >
                  <div
                    className={`h-1.5 w-full rounded-full transition-all ${
                      active ? 'bg-brand-600' : done ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                  <span
                    className={`mt-1.5 hidden truncate text-[11px] font-semibold sm:block ${
                      active ? 'text-brand-700' : done ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {s.id}. {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cuerpo del paso actual */}
        <div className="flex-1 px-6 py-6">
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* PASO 1: INGRESOS */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Paso 1 de 6 · Ingresos mensuales
                </span>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">
                  Cuéntanos sobre tus ingresos mensuales
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  Esta encuesta inicial se realiza una única vez para organizar tu dinero desde cero en Pesos Colombianos (COP).
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex items-start gap-2.5">
                  <Briefcase size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      ¿Cuál es tu sueldo mensual neto? (COP)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Si tienes salario fijo, ingresa lo que recibes libre al mes (deja en 0 si solo eres independiente).
                    </p>
                  </div>
                </div>
                <MoneyInput value={salary} onChange={setSalary} placeholder="Ej. 3,500,000" />
              </div>

              {/* Pregunta Freelance */}
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                      <Laptop size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        ¿Haces trabajos freelance o independientes?
                      </p>
                      <p className="text-xs text-slate-500">
                        Proyectos por cuenta propia, consultorías o ventas
                      </p>
                    </div>
                  </div>
                  <YesNoToggle value={hasFreelance} onChange={setHasFreelance} />
                </div>

                {hasFreelance && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      ¿Cuánto ganas como freelancer al mes (promedio)?
                    </label>
                    <MoneyInput value={freelance} onChange={setFreelance} placeholder="Ej. 1,200,000" />
                  </div>
                )}
              </div>

              {/* Pregunta Otros ingresos */}
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        ¿Tienes otros ingresos mensuales?
                      </p>
                      <p className="text-xs text-slate-500">
                        Rentas, dividendos, bonos o apoyos periódicos
                      </p>
                    </div>
                  </div>
                  <YesNoToggle value={hasOtherIncome} onChange={setHasOtherIncome} />
                </div>

                {hasOtherIncome && (
                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        ¿Cuánto recibes al mes?
                      </label>
                      <MoneyInput value={otherIncome} onChange={setOtherIncome} placeholder="Ej. 500,000" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        ¿De qué proviene?
                      </label>
                      <input
                        type="text"
                        value={otherIncomeDesc}
                        onChange={(e) => setOtherIncomeDesc(e.target.value)}
                        placeholder="Ej. Arriendo, CDT, comisiones..."
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 2: GASTOS ESENCIALES CON FRECUENCIA Y CHECK DE PAGO */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Paso 2 de 6 · Pagos esenciales y check mensual
                </span>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Configura tus pagos esenciales del mes
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Indica cuánto pagas, <strong>cuántas veces al mes</strong> y si ya está pago. Si ya lo pagaste, quedará con <strong>check automático</strong>; si falta por pagar, podrás marcarlo con un clic cuando lo pagues.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {ESSENTIAL_META.map((meta) => (
                  <EssentialOnboardingCard
                    key={meta.key}
                    icon={meta.key === 'housing' ? <Home size={17} className="text-brand-600" /> : undefined}
                    question={meta.question}
                    hint={meta.hint}
                    placeholder={meta.placeholder}
                    subPlaceholder={meta.subPlaceholder}
                    isVariable={meta.isVariable}
                    plan={essentialPlans[meta.key]}
                    onChangePlan={(patch) => updateEssentialPlan(meta.key, patch)}
                    subcategories={subcategories[meta.key]}
                    onAddSub={(name) => addSubcategory(meta.key, name)}
                    onUpdateSub={(id, patch) => updateSubcategory(meta.key, id, patch)}
                    onRemoveSub={(id) => removeSubcategory(meta.key, id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* PASO 3: ESTILO DE VIDA, INVERSIONES Y SUBCATEGORÍAS */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Paso 3 de 6 · Estilo de vida, suscripciones e inversiones
                </span>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Gastos personales, suscripciones e inversiones
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Desglosa por subcategorías (ej. <strong>Spotify: $ 5,100 × 1/mes</strong>, <strong>Finca raíz / Bolsa / Acciones</strong>, <strong>Motilada: $ 22,000 × 4/mes</strong>) y cada categoría sumará el total mensual automáticamente.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ExpenseCategoryCard
                  icon={<TrendingUp size={17} className="text-teal-600" />}
                  question="¿Cuánto destinas a inversiones al mes?"
                  hint="Finca raíz, bolsa, acciones, CDT, fondos de inversión..."
                  value={expenses.investments}
                  onChange={(v) => setExpenseField('investments', v)}
                  placeholder="Ej. 500,000"
                  subcategories={subcategories.investments}
                  onAddSub={(name) => addSubcategory('investments', name)}
                  onUpdateSub={(id, patch) => updateSubcategory('investments', id, patch)}
                  onRemoveSub={(id) => removeSubcategory('investments', id)}
                  subPlaceholder="Ej. Finca raíz / Bolsa / Acciones"
                  quickTemplates={['Finca raíz', 'Bolsa', 'Acciones', 'CDT / Fondos']}
                />
                <ExpenseCategoryCard
                  question="¿Cuánto pagas en suscripciones?"
                  hint="Spotify, Netflix, gimnasio, iCloud, etc."
                  value={expenses.subscriptions}
                  onChange={(v) => setExpenseField('subscriptions', v)}
                  placeholder="Ej. 85,000"
                  subcategories={subcategories.subscriptions}
                  onAddSub={(name) => addSubcategory('subscriptions', name)}
                  onUpdateSub={(id, patch) => updateSubcategory('subscriptions', id, patch)}
                  onRemoveSub={(id) => removeSubcategory('subscriptions', id)}
                  subPlaceholder="Ej. Spotify / Netflix / Gimnasio"
                  quickTemplates={['Spotify', 'Netflix', 'Gimnasio']}
                />
                <ExpenseCategoryCard
                  question="¿Cuánto destinas a ocio?"
                  hint="Cine, salidas, hobbies o eventos"
                  value={expenses.leisure}
                  onChange={(v) => setExpenseField('leisure', v)}
                  placeholder="Ej. 250,000"
                  subcategories={subcategories.leisure}
                  onAddSub={(name) => addSubcategory('leisure', name)}
                  onUpdateSub={(id, patch) => updateSubcategory('leisure', id, patch)}
                  onRemoveSub={(id) => removeSubcategory('leisure', id)}
                  subPlaceholder="Ej. Cine / Salida fin de semana"
                />
                <ExpenseCategoryCard
                  question="¿Cuánto gastas en restaurantes?"
                  hint="Cafés, almuerzos fuera o domicilios"
                  value={expenses.dining}
                  onChange={(v) => setExpenseField('dining', v)}
                  placeholder="Ej. 200,000"
                  subcategories={subcategories.dining}
                  onAddSub={(name) => addSubcategory('dining', name)}
                  onUpdateSub={(id, patch) => updateSubcategory('dining', id, patch)}
                  onRemoveSub={(id) => removeSubcategory('dining', id)}
                  subPlaceholder="Ej. Almuerzos / Cafés"
                />
                <ExpenseCategoryCard
                  question="¿Cuánto estimas en compras y cuidado personal?"
                  hint="Ropa, peluquería / motilada, artículos personales"
                  value={expenses.shopping}
                  onChange={(v) => setExpenseField('shopping', v)}
                  placeholder="Ej. 200,000"
                  subcategories={subcategories.shopping}
                  onAddSub={(name) => addSubcategory('shopping', name)}
                  onUpdateSub={(id, patch) => updateSubcategory('shopping', id, patch)}
                  onRemoveSub={(id) => removeSubcategory('shopping', id)}
                  subPlaceholder="Ej. Motilada / Ropa"
                />
              </div>

              {/* Modo de inicio */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  ¿Cómo registramos estos gastos en {monthLabel(month)}?
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    {
                      id: 'all' as const,
                      title: 'Presupuestos + Gastos',
                      desc: 'Crea límites y descuenta ya estos montos para ver tu saldo disponible real.',
                    },
                    {
                      id: 'fixed_only' as const,
                      title: 'Solo gastos fijos',
                      desc: 'Crea todos los límites, pero solo registra Vivienda, Servicios y Suscripciones.',
                    },
                    {
                      id: 'budgets_only' as const,
                      title: 'Solo presupuestos',
                      desc: 'Define tus topes mensuales y empieza con $ 0 gastado para anotar día a día.',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRecordingMode(opt.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        recordingMode === opt.id
                          ? 'border-brand-600 bg-white ring-2 ring-brand-100'
                          : 'border-slate-200 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <span className="block text-xs font-bold text-slate-900">{opt.title}</span>
                      <span className="mt-1 block text-[11px] leading-snug text-slate-500">
                        {opt.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: DEUDAS */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Paso 4 de 6 · Obligaciones financieras
                </span>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  ¿Tienes deudas o créditos activos actualmente?
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Si tienes tarjetas, préstamos o créditos, MyWallet te recomendará cuál pagar primero para ahorrar intereses.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setHasDebts(false);
                    setError(null);
                  }}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                    !hasDebts
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-100'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2
                    size={20}
                    className={!hasDebts ? 'text-emerald-600' : 'text-slate-300'}
                  />
                  <div>
                    <span className="block text-sm font-bold">No tengo deudas</span>
                    <span className="text-xs opacity-75">Libre de créditos por ahora</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHasDebts(true);
                    if (debtsList.length === 0) setDebtsList([createEmptyDebt('Tarjeta de crédito')]);
                  }}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                    hasDebts
                      ? 'border-brand-600 bg-brand-50 text-brand-950 ring-2 ring-brand-100'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard
                    size={20}
                    className={hasDebts ? 'text-brand-600' : 'text-slate-400'}
                  />
                  <div>
                    <span className="block text-sm font-bold">Sí, tengo deudas</span>
                    <span className="text-xs opacity-75">Quiero llevar su control</span>
                  </div>
                </button>
              </div>

              {hasDebts && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Agregar rápido:</span>
                    {[
                      'Tarjeta de crédito',
                      'Préstamo personal',
                      'Crédito vehicular',
                      'Préstamo educativo',
                    ].map((tpl) => (
                      <button
                        key={tpl}
                        type="button"
                        onClick={() => setDebtsList((prev) => [...prev, createEmptyDebt(tpl)])}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
                      >
                        <Plus size={12} />
                        {tpl}
                      </button>
                    ))}
                  </div>

                  {debtsList.map((d, idx) => (
                    <div
                      key={d.id}
                      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Deuda #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDebtsList((prev) => prev.filter((item) => item.id !== d.id))
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 size={13} />
                          Quitar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">
                            Nombre de la deuda *
                          </label>
                          <input
                            type="text"
                            value={d.name}
                            onChange={(e) =>
                              setDebtsList((prev) =>
                                prev.map((x) => (x.id === d.id ? { ...x, name: e.target.value } : x)),
                              )
                            }
                            placeholder="Ej. Tarjeta Visa"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-600"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">
                            Banco o acreedor
                          </label>
                          <input
                            type="text"
                            value={d.creditor}
                            onChange={(e) =>
                              setDebtsList((prev) =>
                                prev.map((x) =>
                                  x.id === d.id ? { ...x, creditor: e.target.value } : x,
                                ),
                              )
                            }
                            placeholder="Ej. Bancolombia, Davivienda, Nu"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">
                            Monto total (COP) *
                          </label>
                          <FormattedNumberInput
                            value={d.totalAmount}
                            onChange={(val) =>
                              setDebtsList((prev) =>
                                prev.map((x) =>
                                  x.id === d.id ? { ...x, totalAmount: val } : x,
                                ),
                              )
                            }
                            placeholder="5,000,000"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-brand-600"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">
                            ¿Cuánto debes hoy?
                          </label>
                          <FormattedNumberInput
                            value={d.remainingAmount}
                            onChange={(val) =>
                              setDebtsList((prev) =>
                                prev.map((x) =>
                                  x.id === d.id ? { ...x, remainingAmount: val } : x,
                                ),
                              )
                            }
                            placeholder="Igual al total"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-brand-600"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">
                            Cuota mensual
                          </label>
                          <FormattedNumberInput
                            value={d.monthlyPayment}
                            onChange={(val) =>
                              setDebtsList((prev) =>
                                prev.map((x) =>
                                  x.id === d.id ? { ...x, monthlyPayment: val } : x,
                                ),
                              )
                            }
                            placeholder="350,000"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-brand-600"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">
                            Interés anual %
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={d.interestRate}
                            onChange={(e) =>
                              setDebtsList((prev) =>
                                prev.map((x) =>
                                  x.id === d.id ? { ...x, interestRate: e.target.value } : x,
                                ),
                              )
                            }
                            placeholder="24"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-600"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PASO 5: METAS DE AHORRO */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Paso 5 de 6 · Metas de ahorro
                </span>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  ¿Cuáles son tus objetivos de ahorro?
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Define metas concretas (fondo de emergencia, vacaciones, compra importante) y cuánto quieres apartar al mes.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setHasGoals(true);
                    if (goalsList.length === 0) {
                      setGoalsList([createEmptyGoal('Fondo de emergencia', 'shield', '#059669')]);
                    }
                  }}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                    hasGoals
                      ? 'border-brand-600 bg-brand-50 text-brand-950 ring-2 ring-brand-100'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <PiggyBank
                    size={20}
                    className={hasGoals ? 'text-brand-600' : 'text-slate-400'}
                  />
                  <div>
                    <span className="block text-sm font-bold">Sí, definir metas</span>
                    <span className="text-xs opacity-75">Apartar dinero con propósito</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHasGoals(false);
                    setError(null);
                  }}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                    !hasGoals
                      ? 'border-slate-800 bg-slate-100 text-slate-900'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Check size={20} className={!hasGoals ? 'text-slate-800' : 'text-slate-300'} />
                  <div>
                    <span className="block text-sm font-bold">Por ahora no</span>
                    <span className="text-xs opacity-75">Las crearé más adelante</span>
                  </div>
                </button>
              </div>

              {hasGoals && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Plantillas:</span>
                    {[
                      { name: 'Fondo de emergencia', icon: 'shield', color: '#059669' },
                      { name: 'Viaje / Vacaciones', icon: 'plane', color: '#2563EB' },
                      { name: 'Compra importante', icon: 'laptop', color: '#8B5CF6' },
                    ].map((tpl) => (
                      <button
                        key={tpl.name}
                        type="button"
                        onClick={() =>
                          setGoalsList((prev) => [
                            ...prev,
                            createEmptyGoal(tpl.name, tpl.icon, tpl.color),
                          ])
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
                      >
                        <Plus size={12} />
                        {tpl.name}
                      </button>
                    ))}
                  </div>

                  {goalsList.map((g, idx) => (
                    <div
                      key={g.id}
                      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Meta #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setGoalsList((prev) => prev.filter((item) => item.id !== g.id))
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 size={13} />
                          Quitar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">
                            Nombre de la meta *
                          </label>
                          <input
                            type="text"
                            value={g.name}
                            onChange={(e) =>
                              setGoalsList((prev) =>
                                prev.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)),
                              )
                            }
                            placeholder="Ej. Fondo de emergencia"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-600"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">
                            Fecha límite (opcional)
                          </label>
                          <input
                            type="date"
                            value={g.deadline}
                            onChange={(e) =>
                              setGoalsList((prev) =>
                                prev.map((x) =>
                                  x.id === g.id ? { ...x, deadline: e.target.value } : x,
                                ),
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">
                            Monto objetivo (COP) *
                          </label>
                          <FormattedNumberInput
                            value={g.targetAmount}
                            onChange={(val) =>
                              setGoalsList((prev) =>
                                prev.map((x) =>
                                  x.id === g.id ? { ...x, targetAmount: val } : x,
                                ),
                              )
                            }
                            placeholder="10,000,000"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-brand-600"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">
                            ¿Cuánto tienes ahorrado hoy?
                          </label>
                          <FormattedNumberInput
                            value={g.currentSaved}
                            onChange={(val) =>
                              setGoalsList((prev) =>
                                prev.map((x) =>
                                  x.id === g.id ? { ...x, currentSaved: val } : x,
                                ),
                              )
                            }
                            placeholder="0"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-brand-600"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">
                            Aporte para este mes
                          </label>
                          <FormattedNumberInput
                            value={g.monthlyContribution}
                            onChange={(val) =>
                              setGoalsList((prev) =>
                                prev.map((x) =>
                                  x.id === g.id
                                    ? { ...x, monthlyContribution: val }
                                    : x,
                                ),
                              )
                            }
                            placeholder="400,000"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-brand-600"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PASO 6: RESUMEN FINAL */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Paso 6 de 6 · Confirmación final
                </span>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Así quedará organizado tu dinero en {monthLabel(month)}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Revisa tus cifras antes de finalizar. Una vez guardadas, esta encuesta inicial se cerrará permanentemente y administrarás todo desde el panel principal.
                </p>
              </div>

              <div
                className={`rounded-2xl p-5 text-white shadow-md ${
                  preview.estimatedAvailable >= 0
                    ? 'bg-gradient-to-br from-slate-900 to-brand-700'
                    : 'bg-gradient-to-br from-rose-700 to-rose-900'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-100">
                      <Sparkles size={14} />
                      Disponible estimado para el mes
                    </span>
                    <p className="mt-1 text-3xl font-extrabold">
                      {formatMoney(preview.estimatedAvailable)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/15 px-3.5 py-2 text-right text-xs">
                    <span className="block text-blue-100">Presupuesto total asignado</span>
                    <span className="font-bold text-white">
                      {formatMoney(preview.totalBudgeted)}
                    </span>
                    {preview.totalSubcategories > 0 && (
                      <span className="mt-0.5 block text-[10px] text-blue-100">
                        Incluye {preview.totalSubcategories} subcategoría(s)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 p-3.5">
                  <span className="text-[11px] font-medium text-slate-500">Ingresos del mes</span>
                  <p className="mt-1 text-base font-bold text-emerald-600">
                    {formatMoney(preview.totalIncome)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3.5">
                  <span className="text-[11px] font-medium text-slate-500">Gastos registrados</span>
                  <p className="mt-1 text-base font-bold text-rose-600">
                    {formatMoney(preview.recordedExpenses)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3.5">
                  <span className="text-[11px] font-medium text-slate-500">Ahorro a metas</span>
                  <p className="mt-1 text-base font-bold text-brand-600">
                    {formatMoney(preview.monthlySavings)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3.5">
                  <span className="text-[11px] font-medium text-slate-500">Deudas registradas</span>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {formatMoney(preview.totalDebtBalance)}
                  </p>
                </div>
              </div>

              {preview.estimatedAvailable < 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>
                    Tus gastos y aportes planeados superan tus ingresos mensuales por{' '}
                    <strong>{formatMoney(Math.abs(preview.estimatedAvailable))}</strong>. Puedes
                    retroceder para ajustar algún monto o guardarlo así para analizar dónde recortar.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer de navegación del asistente */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft size={14} />
              Anterior
            </button>
          ) : (
            <span className="text-xs text-slate-400">Paso 1 de 6</span>
          )}

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Siguiente
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleFinish()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check size={15} />
              {submitting ? 'Guardando tu plan...' : 'Guardar y entrar a MyWallet'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <FormattedNumberInput
      prefix="COP $"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-14 pr-3 text-sm font-bold text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
    />
  );
}

interface EssentialOnboardingCardProps {
  icon?: ReactNode;
  question: string;
  hint: string;
  placeholder: string;
  subPlaceholder: string;
  isVariable: boolean;
  plan: DraftEssentialPlan;
  onChangePlan: (patch: Partial<DraftEssentialPlan>) => void;
  subcategories: DraftSubcategory[];
  onAddSub: (defaultName?: string) => void;
  onUpdateSub: (id: string, patch: Partial<DraftSubcategory>) => void;
  onRemoveSub: (id: string) => void;
}

function EssentialOnboardingCard({
  icon,
  question,
  hint,
  placeholder,
  subPlaceholder,
  isVariable,
  plan,
  onChangePlan,
  subcategories,
  onAddSub,
  onUpdateSub,
  onRemoveSub,
}: EssentialOnboardingCardProps) {
  const hasSubs = subcategories.length > 0;
  const subSum = subcategories.reduce((sum, s) => sum + subMonthlyTotal(s), 0);
  const unit = hasSubs ? subSum : num(plan.unitAmount);
  const freq = hasSubs ? 1 : freqInt(plan.frequencyMonth);
  const monthlyTotal = unit * freq;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-semibold text-slate-900">{question}</p>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isVariable
                      ? 'bg-brand-50 text-brand-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isVariable ? 'Variable' : 'Fijo'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{hint}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAddSub('')}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            <Plus size={12} />
            Subcategoría
          </button>
        </div>

        {!hasSubs ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-medium text-slate-500">
                Valor por cada pago (COP)
              </label>
              <MoneyInput
                value={plan.unitAmount}
                onChange={(v) => onChangePlan({ unitAmount: v })}
                placeholder={placeholder}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500">
                Veces / mes
              </label>
              <input
                type="number"
                min="1"
                max="31"
                step="1"
                value={plan.frequencyMonth}
                onChange={(e) => onChangePlan({ frequencyMonth: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-brand-50/70 px-3 py-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-brand-900">
                <Layers size={13} className="text-brand-600" />
                Suma automática ({subcategories.length})
              </span>
              <span className="font-bold text-brand-700">{formatMoney(subSum)} / mes</span>
            </div>

            {subcategories.map((sub) => (
              <div
                key={sub.id}
                className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={sub.name}
                    onChange={(e) => onUpdateSub(sub.id, { name: e.target.value })}
                    placeholder={subPlaceholder}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-brand-600"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveSub(sub.id)}
                    aria-label="Quitar subcategoría"
                    className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FormattedNumberInput
                    value={sub.unitAmount}
                    onChange={(val) => onUpdateSub(sub.id, { unitAmount: val })}
                    placeholder="Valor COP"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-600"
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={sub.frequencyMonth}
                    onChange={(e) => onUpdateSub(sub.id, { frequencyMonth: e.target.value })}
                    placeholder="Veces/mes"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-600"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {monthlyTotal > 0 && (
          <div className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Total mensual estimado:</span>
              <span className="font-bold text-slate-900">{formatMoney(monthlyTotal)}</span>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-slate-700">
                ¿Ya está pago este mes o falta por pagar?
              </p>
              <div className={`grid gap-1.5 ${freq > 1 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <button
                  type="button"
                  onClick={() => onChangePlan({ paidStatus: 'pending' })}
                  className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                    plan.paidStatus === 'pending'
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Falta por pagar
                </button>
                <button
                  type="button"
                  onClick={() => onChangePlan({ paidStatus: 'paid' })}
                  className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                    plan.paidStatus === 'paid'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Ya está pago ✓
                </button>
                {freq > 1 && (
                  <button
                    type="button"
                    onClick={() => onChangePlan({ paidStatus: 'partial', paidCount: '1' })}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                      plan.paidStatus === 'partial'
                        ? 'border-brand-600 bg-brand-50 text-brand-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Parcial
                  </button>
                )}
              </div>
            </div>

            {freq > 1 && plan.paidStatus === 'partial' && (
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-medium text-slate-600">
                  ¿Cuántos de los {freq} pagos ya hiciste?
                </label>
                <input
                  type="number"
                  min="1"
                  max={freq}
                  step="1"
                  value={plan.paidCount}
                  onChange={(e) => onChangePlan({ paidCount: e.target.value })}
                  className="w-20 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold outline-none focus:border-brand-600"
                />
              </div>
            )}

            {isVariable && plan.paidStatus !== 'pending' && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  ¿Cuánto pagaste realmente? (opcional)
                </label>
                <FormattedNumberInput
                  value={plan.paidAmountOverride}
                  onChange={(val) => onChangePlan({ paidAmountOverride: val })}
                  placeholder={`Por defecto ${formatMoney(unit)}`}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-brand-600"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ExpenseCategoryCardProps {
  icon?: ReactNode;
  question: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  subcategories: DraftSubcategory[];
  onAddSub: (defaultName?: string) => void;
  onUpdateSub: (id: string, patch: Partial<DraftSubcategory>) => void;
  onRemoveSub: (id: string) => void;
  subPlaceholder: string;
  quickTemplates?: string[];
}

function ExpenseCategoryCard({
  icon,
  question,
  hint,
  value,
  onChange,
  placeholder,
  subcategories,
  onAddSub,
  onUpdateSub,
  onRemoveSub,
  subPlaceholder,
  quickTemplates,
}: ExpenseCategoryCardProps) {
  const hasSubs = subcategories.length > 0;
  const subSum = subcategories.reduce((sum, s) => sum + subMonthlyTotal(s), 0);

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
            <div>
              <p className="text-sm font-semibold text-slate-900">{question}</p>
              <p className="text-[11px] text-slate-500">{hint}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAddSub('')}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            <Plus size={12} />
            Subcategoría
          </button>
        </div>

        {quickTemplates && quickTemplates.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {quickTemplates.map((tpl) => (
              <button
                key={tpl}
                type="button"
                onClick={() => onAddSub(tpl)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
              >
                <Plus size={10} />
                {tpl}
              </button>
            ))}
          </div>
        )}

        {!hasSubs ? (
          <MoneyInput value={value} onChange={onChange} placeholder={placeholder} />
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-xl bg-brand-50/70 px-3 py-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-brand-900">
                <Layers size={13} className="text-brand-600" />
                Suma automática ({subcategories.length})
              </span>
              <span className="font-bold text-brand-700">{formatMoney(subSum)} / mes</span>
            </div>

            {subcategories.map((sub) => (
              <div
                key={sub.id}
                className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={sub.name}
                    onChange={(e) => onUpdateSub(sub.id, { name: e.target.value })}
                    placeholder={subPlaceholder}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-brand-600"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveSub(sub.id)}
                    aria-label="Quitar subcategoría"
                    className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-0.5 block text-[10px] font-medium text-slate-500">
                      Valor unitario (COP)
                    </label>
                    <FormattedNumberInput
                      value={sub.unitAmount}
                      onChange={(val) => onUpdateSub(sub.id, { unitAmount: val })}
                      placeholder="22,000"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-600"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] font-medium text-slate-500">
                      Veces al mes
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={sub.frequencyMonth}
                      onChange={(e) => onUpdateSub(sub.id, { frequencyMonth: e.target.value })}
                      placeholder="1"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-600"
                    />
                  </div>
                </div>

                <div className="text-right text-[11px] font-semibold text-slate-600">
                  Subtotal: <span className="text-slate-900">{formatMoney(subMonthlyTotal(sub))}/mes</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function YesNoToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          !value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
        }`}
      >
        No
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          value ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500'
        }`}
      >
        Sí
      </button>
    </div>
  );
}
