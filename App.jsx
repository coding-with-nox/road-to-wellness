import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = {
  parchment: "#F5F0E8",
  cream: "#EDE6D6",
  cream2: "#E8DFC8",
  wine: "#6B1A2A",
  wineLight: "#9B3A4A",
  gold: "#B8963E",
  dark: "#2C1A12",
  mid: "#6B5744",
  lightMid: "#9B8070",
  border: "#C8B89A",
  olive: "#5A6B3A",
  orange: "#B05A20",
  blue: "#2A5A7A",
};

const STORAGE_KEY = "roadToWellnessData";
const API_BASE = "http://localhost:4000/api";
const TODAY = new Date().toISOString().slice(0, 10);

const defaultSettings = {
  kcalBudget: 1620,
  waterTarget: 2500,
  startWeight: 82,
  startDate: TODAY,
  hydrationPattern: "Balanced",
};

const defaultData = {
  settings: defaultSettings,
  days: {},
  weights: [],
  milestones: [],
};

const tabs = ["Today", "💧 Water", "Charts", "History", "Weight", "Settings"];

const whenOptions = [
  "morning",
  "during lunch",
  "afternoon",
  "before dinner",
  "during dinner",
  "evening home",
  "evening out",
];

const quickHydration = [
  { label: "Glass", ml: 200, type: "Water", kcal: 0, isAlcohol: false },
  { label: "Big glass", ml: 500, type: "Water", kcal: 0, isAlcohol: false },
  { label: "Bottle", ml: 750, type: "Water", kcal: 0, isAlcohol: false },
  { label: "Bottle 1L", ml: 1000, type: "Water", kcal: 0, isAlcohol: false },
  { label: "3 evening glasses", ml: 600, type: "Water", kcal: 0, isAlcohol: false },
  { label: "Coffee", ml: 180, type: "Coffee", kcal: 5, isAlcohol: false },
  { label: "Tea", ml: 250, type: "Tea", kcal: 2, isAlcohol: false },
  { label: "Sparkling", ml: 330, type: "Sparkling water", kcal: 0, isAlcohol: false },
  { label: "Beer", ml: 330, type: "Beer", kcal: 150, isAlcohol: true },
  { label: "Wine", ml: 150, type: "Wine", kcal: 125, isAlcohol: true },
];

const hydrationPatterns = ["Balanced", "Morning heavy", "Evening heavy", "Desk worker", "Athlete"];

const dayDiff = (dateA, dateB) => {
  const diff = new Date(dateA).setHours(0, 0, 0, 0) - new Date(dateB).setHours(0, 0, 0, 0);
  return Math.round(diff / 86400000);
};

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function getDay(days, date) {
  return (
    days[date] || {
      meals: [],
      drinks: [],
      cheatDay: false,
      notes: "",
    }
  );
}

function ProgressBar({ value, max, color, overColor, markers = [] }) {
  const ratio = Math.max(0, Math.min(100, (value / max) * 100));
  const over = value > max;
  return (
    <div style={{ position: "relative", margin: "8px 0 12px" }}>
      <div style={{ height: 14, background: COLORS.cream2, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, ratio)}%`,
            borderRadius: 10,
            background: over ? overColor : color,
            transition: "width 0.25s",
          }}
        />
      </div>
      {markers.map((marker) => (
        <div
          key={marker}
          style={{
            position: "absolute",
            left: `${Math.min(100, (marker / max) * 100)}%`,
            top: -2,
            transform: "translateX(-50%)",
            fontSize: 10,
            color: COLORS.mid,
          }}
        >
          |
          <div>{(marker / 1000).toFixed(marker % 1000 ? 1 : 0)}L</div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(defaultData);
  const [isHydrated, setIsHydrated] = useState(false);
  const saveTimer = useRef(null);
  const [tab, setTab] = useState("Today");
  const [selectedDate, setSelectedDate] = useState(TODAY);

  const [mealForm, setMealForm] = useState({ name: "", items: "", kcal: "" });
  const [drinkForm, setDrinkForm] = useState({ type: "Water", ml: "", when: whenOptions[0], kcal: "", isAlcohol: false });
  const [editMealId, setEditMealId] = useState(null);
  const [editDrinkId, setEditDrinkId] = useState(null);

  const [weightForm, setWeightForm] = useState({ date: TODAY, kg: "" });
  const [milestoneForm, setMilestoneForm] = useState({ name: "", date: "", targetWeight: "", description: "" });
  const [customHydration, setCustomHydration] = useState({ ml: "", type: "Water", when: whenOptions[0], kcal: "0", isAlcohol: false });

  useEffect(() => {
    const hydrate = async () => {
      try {
        const response = await fetch(`${API_BASE}/state`);
        if (!response.ok) throw new Error("API unavailable");
        const serverData = await response.json();
        setData({ ...defaultData, ...serverData, settings: { ...defaultSettings, ...(serverData.settings || {}) } });
      } catch {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setData(defaultData);
          setIsHydrated(true);
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          setData({ ...defaultData, ...parsed, settings: { ...defaultSettings, ...(parsed.settings || {}) } });
        } catch {
          setData(defaultData);
        }
      } finally {
        setIsHydrated(true);
      }
    };
    hydrate();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/state`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } catch {
        // Offline fallback already persisted in localStorage.
      }
    }, 300);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [data, isHydrated]);

  const selectedDay = getDay(data.days, selectedDate);
  const todayDay = getDay(data.days, TODAY);

  const todayStats = useMemo(() => {
    const mealKcal = todayDay.meals.reduce((sum, meal) => sum + Number(meal.kcal || 0), 0);
    const drinkKcal = todayDay.drinks.reduce((sum, drink) => sum + Number(drink.kcal || 0), 0);
    const waterMl = todayDay.drinks
      .filter((d) => !d.isAlcohol)
      .reduce((sum, drink) => sum + Number(drink.ml || 0), 0);
    const alcoholDrinks = todayDay.drinks.filter((d) => d.isAlcohol);
    return {
      totalKcal: mealKcal + drinkKcal,
      waterMl,
      alcoholDrinks,
      waterDrinks: todayDay.drinks.filter((d) => !d.isAlcohol),
    };
  }, [todayDay]);

  const allDays = useMemo(() => {
    return Object.entries(data.days)
      .map(([date, day]) => {
        const mealKcal = day.meals.reduce((s, m) => s + Number(m.kcal || 0), 0);
        const drinkKcal = day.drinks.reduce((s, d) => s + Number(d.kcal || 0), 0);
        const waterMl = day.drinks.filter((d) => !d.isAlcohol).reduce((s, d) => s + Number(d.ml || 0), 0);
        return {
          date,
          ...day,
          totalKcal: mealKcal + drinkKcal,
          waterMl,
          inBudget: mealKcal + drinkKcal <= Number(data.settings.kcalBudget),
          waterHit: waterMl >= Number(data.settings.waterTarget),
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.days, data.settings.kcalBudget, data.settings.waterTarget]);

  const historyStats = useMemo(() => {
    if (!allDays.length) return { avgKcal: 0, inBudgetDays: 0, totalDeficit: 0, waterTargetDays: 0 };
    const avgKcal = allDays.reduce((s, d) => s + d.totalKcal, 0) / allDays.length;
    const inBudgetDays = allDays.filter((d) => d.inBudget).length;
    const totalDeficit = allDays.reduce((s, d) => s + (Number(data.settings.kcalBudget) - d.totalKcal), 0);
    const waterTargetDays = allDays.filter((d) => d.waterHit).length;
    return { avgKcal, inBudgetDays, totalDeficit, waterTargetDays };
  }, [allDays, data.settings.kcalBudget]);

  const milestoneCountdown = useMemo(() => {
    const upcoming = data.milestones
      .map((m) => ({ ...m, daysLeft: dayDiff(m.date, TODAY) }))
      .filter((m) => m.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);
    return upcoming[0] || null;
  }, [data.milestones]);

  const chartRows = useMemo(() => {
    const rows = [...allDays]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: d.date.slice(5),
        fullDate: d.date,
        kcal: d.totalKcal,
        budget: Number(data.settings.kcalBudget),
        water: d.waterMl,
        target: Number(data.settings.waterTarget),
      }));

    const sortedWeights = [...data.weights].sort((a, b) => a.date.localeCompare(b.date));
    let runningDeficit = 0;
    rows.forEach((r) => {
      runningDeficit += Number(data.settings.kcalBudget) - r.kcal;
      r.projected = Number(data.settings.startWeight) - runningDeficit / 7700;
      const matching = sortedWeights.find((w) => w.date === r.fullDate);
      r.actual = matching ? Number(matching.kg) : null;
    });
    return rows;
  }, [allDays, data.settings, data.weights]);

  const updateDay = (date, updater) => {
    setData((prev) => {
      const oldDay = getDay(prev.days, date);
      const newDay = updater(oldDay);
      return { ...prev, days: { ...prev.days, [date]: newDay } };
    });
  };

  const saveMeal = () => {
    if (!mealForm.name || !mealForm.kcal) return;
    updateDay(selectedDate, (day) => {
      const meal = { id: editMealId || uid(), name: mealForm.name, items: mealForm.items, kcal: Number(mealForm.kcal) };
      const meals = editMealId ? day.meals.map((m) => (m.id === editMealId ? meal : m)) : [...day.meals, meal];
      return { ...day, meals };
    });
    setMealForm({ name: "", items: "", kcal: "" });
    setEditMealId(null);
  };

  const saveDrink = () => {
    if (!drinkForm.type || !drinkForm.ml) return;
    updateDay(selectedDate, (day) => {
      const drink = {
        id: editDrinkId || uid(),
        type: drinkForm.type,
        ml: Number(drinkForm.ml),
        when: drinkForm.when,
        kcal: Number(drinkForm.kcal || 0),
        isAlcohol: !!drinkForm.isAlcohol,
      };
      const drinks = editDrinkId ? day.drinks.map((d) => (d.id === editDrinkId ? drink : d)) : [...day.drinks, drink];
      return { ...day, drinks };
    });
    setDrinkForm({ type: "Water", ml: "", when: whenOptions[0], kcal: "", isAlcohol: false });
    setEditDrinkId(null);
  };

  const removeMeal = (id) => updateDay(selectedDate, (day) => ({ ...day, meals: day.meals.filter((m) => m.id !== id) }));
  const removeDrink = (id) => updateDay(selectedDate, (day) => ({ ...day, drinks: day.drinks.filter((d) => d.id !== id) }));

  const addWeight = () => {
    if (!weightForm.date || !weightForm.kg) return;
    setData((prev) => {
      const without = prev.weights.filter((w) => w.date !== weightForm.date);
      return { ...prev, weights: [...without, { id: uid(), date: weightForm.date, kg: Number(weightForm.kg) }] };
    });
    setWeightForm({ date: TODAY, kg: "" });
  };

  const addMilestone = () => {
    if (!milestoneForm.name || !milestoneForm.date || !milestoneForm.targetWeight) return;
    setData((prev) => ({
      ...prev,
      milestones: [...prev.milestones, { ...milestoneForm, id: uid(), targetWeight: Number(milestoneForm.targetWeight) }],
    }));
    setMilestoneForm({ name: "", date: "", targetWeight: "", description: "" });
  };

  const addQuickHydration = (q) => {
    updateDay(TODAY, (day) => ({
      ...day,
      drinks: [...day.drinks, { id: uid(), type: q.type, ml: q.ml, when: customHydration.when, kcal: q.kcal, isAlcohol: q.isAlcohol }],
    }));
  };

  const addCustomHydration = () => {
    if (!customHydration.ml) return;
    updateDay(TODAY, (day) => ({
      ...day,
      drinks: [
        ...day.drinks,
        {
          id: uid(),
          type: customHydration.type,
          ml: Number(customHydration.ml),
          when: customHydration.when,
          kcal: Number(customHydration.kcal || 0),
          isAlcohol: customHydration.isAlcohol,
        },
      ],
    }));
    setCustomHydration({ ml: "", type: "Water", when: customHydration.when, kcal: "0", isAlcohol: false });
  };

  const weightSorted = [...data.weights].sort((a, b) => a.date.localeCompare(b.date));
  const latestWeight = weightSorted.length ? weightSorted[weightSorted.length - 1].kg : Number(data.settings.startWeight);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.parchment, color: COLORS.dark, fontFamily: "Georgia, serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        button,input,select,textarea { font-family: Georgia, serif; }
        .rtw-card { background:${COLORS.cream}; border:1px solid ${COLORS.border}; border-radius:14px; padding:12px; margin-bottom:12px; }
        .rtw-title { color:${COLORS.wine}; margin:0 0 10px; font-size:1.1rem; }
        .rtw-input { width:100%; padding:8px; margin:4px 0; border:1px solid ${COLORS.border}; border-radius:8px; background:${COLORS.parchment}; color:${COLORS.dark}; }
        .rtw-btn { border:1px solid ${COLORS.wine}; background:${COLORS.wine}; color:${COLORS.parchment}; padding:8px 12px; border-radius:8px; }
        .rtw-btn-alt { border:1px solid ${COLORS.gold}; background:${COLORS.cream2}; color:${COLORS.dark}; padding:7px 10px; border-radius:8px; }
        .rtw-pill { display:inline-block; border:1px solid ${COLORS.border}; border-radius:999px; padding:3px 8px; font-size:12px; margin-right:6px; }
        .rtw-grid { display:grid; gap:10px; }
        @media (min-width: 780px) { .rtw-grid.cols-2 { grid-template-columns:1fr 1fr; } .rtw-wrap{max-width:980px;margin:0 auto;} }
      `}</style>

      <div className="rtw-wrap" style={{ padding: 12 }}>
        <header className="rtw-card" style={{ background: COLORS.cream2 }}>
          <h1 style={{ margin: 0, color: COLORS.wine }}>RoadToWellness</h1>
          <div style={{ color: COLORS.mid, marginTop: 4 }}>Today: {TODAY}</div>
          {milestoneCountdown && (
            <div style={{ marginTop: 8, color: COLORS.orange }}>
              Next milestone: <strong>{milestoneCountdown.name}</strong> in {milestoneCountdown.daysLeft} day(s)
            </div>
          )}
        </header>

        <nav className="rtw-card" style={{ display: "flex", overflowX: "auto", gap: 8, position: "sticky", top: 0, zIndex: 3 }}>
          {tabs.map((t) => (
            <button
              key={t}
              className="rtw-btn-alt"
              onClick={() => setTab(t)}
              style={{ background: tab === t ? COLORS.wine : COLORS.cream2, color: tab === t ? COLORS.parchment : COLORS.dark, whiteSpace: "nowrap" }}
            >
              {t}
            </button>
          ))}
        </nav>

        {tab === "Today" && (
          <div className="rtw-grid cols-2">
            <section className="rtw-card">
              <h2 className="rtw-title">Dashboard (Today)</h2>
              <div>
                Kcal: <strong>{todayStats.totalKcal}</strong> / {data.settings.kcalBudget}
                <ProgressBar value={todayStats.totalKcal} max={Number(data.settings.kcalBudget)} color={COLORS.olive} overColor={COLORS.wineLight} />
              </div>
              <div>
                Water: <strong>{todayStats.waterMl} ml</strong> / {data.settings.waterTarget} ml
                <ProgressBar value={todayStats.waterMl} max={Number(data.settings.waterTarget)} color={COLORS.blue} overColor={COLORS.wineLight} markers={[1000, 1500, 2000, 2500]} />
              </div>
              <div className="rtw-pill" style={{ background: COLORS.parchment }}>
                Remaining kcal: {Number(data.settings.kcalBudget) - todayStats.totalKcal}
              </div>
              <div className="rtw-pill" style={{ background: COLORS.parchment }}>
                Remaining water: {Number(data.settings.waterTarget) - todayStats.waterMl} ml
              </div>

              <h3 className="rtw-title" style={{ marginTop: 12 }}>Meals</h3>
              {todayDay.meals.map((meal) => (
                <div key={meal.id} style={{ borderBottom: `1px dashed ${COLORS.border}`, padding: "6px 0" }}>
                  <strong>{meal.name}</strong> ({meal.kcal} kcal)
                  <div style={{ color: COLORS.mid }}>{meal.items}</div>
                </div>
              ))}

              <h3 className="rtw-title" style={{ marginTop: 12 }}>Drinks (non-alcoholic)</h3>
              {todayStats.waterDrinks.map((drink) => (
                <div key={drink.id}>{drink.type} - {drink.ml} ml ({drink.when})</div>
              ))}

              <h3 className="rtw-title" style={{ marginTop: 12 }}>Alcoholic drinks</h3>
              {todayStats.alcoholDrinks.map((drink) => (
                <div key={drink.id}>{drink.type} - {drink.ml} ml - {drink.kcal} kcal ({drink.when})</div>
              ))}

              <h3 className="rtw-title" style={{ marginTop: 12 }}>Day notes</h3>
              <div style={{ color: COLORS.mid }}>{todayDay.notes || "No notes for today."}</div>
            </section>

            <section className="rtw-card">
              <h2 className="rtw-title">Daily Log Editor</h2>
              <input className="rtw-input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />

              <label><input type="checkbox" checked={selectedDay.cheatDay} onChange={(e) => updateDay(selectedDate, (day) => ({ ...day, cheatDay: e.target.checked }))} /> Cheat day</label>
              <textarea className="rtw-input" rows={3} placeholder="Daily notes" value={selectedDay.notes} onChange={(e) => updateDay(selectedDate, (day) => ({ ...day, notes: e.target.value }))} />

              <h3 className="rtw-title">Meal entry</h3>
              <input className="rtw-input" placeholder="Meal name" value={mealForm.name} onChange={(e) => setMealForm((s) => ({ ...s, name: e.target.value }))} />
              <textarea className="rtw-input" rows={2} placeholder="Items list" value={mealForm.items} onChange={(e) => setMealForm((s) => ({ ...s, items: e.target.value }))} />
              <input className="rtw-input" type="number" placeholder="kcal" value={mealForm.kcal} onChange={(e) => setMealForm((s) => ({ ...s, kcal: e.target.value }))} />
              <button className="rtw-btn" onClick={saveMeal}>{editMealId ? "Update meal" : "Add meal"}</button>

              {selectedDay.meals.map((meal) => (
                <div key={meal.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
                  <div>{meal.name} ({meal.kcal} kcal)</div>
                  <div>
                    <button className="rtw-btn-alt" onClick={() => { setEditMealId(meal.id); setMealForm({ name: meal.name, items: meal.items, kcal: meal.kcal }); }}>Edit</button>{" "}
                    <button className="rtw-btn-alt" onClick={() => removeMeal(meal.id)}>Delete</button>
                  </div>
                </div>
              ))}

              <h3 className="rtw-title" style={{ marginTop: 14 }}>Drink entry</h3>
              <input className="rtw-input" placeholder="Drink type" value={drinkForm.type} onChange={(e) => setDrinkForm((s) => ({ ...s, type: e.target.value }))} />
              <input className="rtw-input" type="number" placeholder="ml" value={drinkForm.ml} onChange={(e) => setDrinkForm((s) => ({ ...s, ml: e.target.value }))} />
              <select className="rtw-input" value={drinkForm.when} onChange={(e) => setDrinkForm((s) => ({ ...s, when: e.target.value }))}>
                {whenOptions.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              <label><input type="checkbox" checked={drinkForm.isAlcohol} onChange={(e) => setDrinkForm((s) => ({ ...s, isAlcohol: e.target.checked }))} /> Alcoholic</label>
              <input className="rtw-input" type="number" placeholder="kcal" value={drinkForm.kcal} onChange={(e) => setDrinkForm((s) => ({ ...s, kcal: e.target.value }))} />
              <button className="rtw-btn" onClick={saveDrink}>{editDrinkId ? "Update drink" : "Add drink"}</button>

              {selectedDay.drinks.map((drink) => (
                <div key={drink.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
                  <div>{drink.type} {drink.ml}ml {drink.kcal ? `(${drink.kcal} kcal)` : ""}</div>
                  <div>
                    <button className="rtw-btn-alt" onClick={() => { setEditDrinkId(drink.id); setDrinkForm(drink); }}>Edit</button>{" "}
                    <button className="rtw-btn-alt" onClick={() => removeDrink(drink.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {tab === "💧 Water" && (
          <section className="rtw-card">
            <h2 className="rtw-title">Hydration tab</h2>
            <select className="rtw-input" value={customHydration.when} onChange={(e) => setCustomHydration((s) => ({ ...s, when: e.target.value }))}>
              {whenOptions.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              {quickHydration.map((q) => (
                <button key={q.label} className="rtw-btn-alt" onClick={() => addQuickHydration(q)}>{q.label} ({q.ml}ml)</button>
              ))}
            </div>

            <h3 className="rtw-title" style={{ marginTop: 14 }}>Custom hydration entry</h3>
            <input className="rtw-input" placeholder="Type" value={customHydration.type} onChange={(e) => setCustomHydration((s) => ({ ...s, type: e.target.value }))} />
            <input className="rtw-input" type="number" placeholder="ml" value={customHydration.ml} onChange={(e) => setCustomHydration((s) => ({ ...s, ml: e.target.value }))} />
            <input className="rtw-input" type="number" placeholder="kcal (if alcoholic)" value={customHydration.kcal} onChange={(e) => setCustomHydration((s) => ({ ...s, kcal: e.target.value }))} />
            <label><input type="checkbox" checked={customHydration.isAlcohol} onChange={(e) => setCustomHydration((s) => ({ ...s, isAlcohol: e.target.checked }))} /> Alcoholic</label>
            <button className="rtw-btn" onClick={addCustomHydration}>Add hydration entry</button>

            <div className="rtw-card" style={{ marginTop: 12, background: COLORS.parchment }}>
              <h3 className="rtw-title">Daily hydration schedule guide</h3>
              <ul style={{ margin: 0, paddingLeft: 18, color: COLORS.mid }}>
                <li>Morning: 500ml on waking + tea/coffee.</li>
                <li>Lunch window: 500-750ml during and after meal.</li>
                <li>Afternoon: 500ml split in two glasses.</li>
                <li>Before and during dinner: 500ml.</li>
                <li>Evening: 250-500ml depending on activity.</li>
              </ul>
            </div>

            <h3 className="rtw-title">Today hydration entries</h3>
            {todayDay.drinks.map((d) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px dashed ${COLORS.border}`, padding: "6px 0" }}>
                <div>{d.type} - {d.ml}ml ({d.when})</div>
                <button className="rtw-btn-alt" onClick={() => updateDay(TODAY, (day) => ({ ...day, drinks: day.drinks.filter((x) => x.id !== d.id) }))}>×</button>
              </div>
            ))}
          </section>
        )}

        {tab === "Charts" && (
          <section className="rtw-card">
            <h2 className="rtw-title">Charts</h2>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={chartRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="kcal" fill={COLORS.wineLight} />
                  <Line dataKey="budget" stroke={COLORS.olive} dot={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={chartRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="water" fill={COLORS.blue} />
                  <Line dataKey="target" stroke={COLORS.gold} dot={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={chartRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} />
                  <Tooltip />
                  <Legend />
                  <Line dataKey="actual" stroke={COLORS.wine} name="Actual weight" />
                  <Line dataKey="projected" stroke={COLORS.olive} dot={false} name="Projected" />
                  {data.milestones.map((m) => (
                    <ReferenceLine key={m.id} y={Number(m.targetWeight)} stroke={COLORS.orange} strokeDasharray="4 4" label={m.name} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {tab === "History" && (
          <section className="rtw-card">
            <h2 className="rtw-title">History</h2>
            <div className="rtw-card" style={{ background: COLORS.parchment }}>
              <strong>Statistics</strong>
              <div>Avg kcal: {historyStats.avgKcal.toFixed(0)}</div>
              <div>Days in budget: {historyStats.inBudgetDays}/{allDays.length}</div>
              <div>Total deficit: {historyStats.totalDeficit.toFixed(0)} kcal</div>
              <div>Days hitting water target: {historyStats.waterTargetDays}/{allDays.length}</div>
            </div>
            {allDays.map((day) => (
              <button key={day.date} className="rtw-card" style={{ width: "100%", textAlign: "left" }} onClick={() => { setSelectedDate(day.date); setTab("Today"); }}>
                <div><strong>{day.date}</strong> {day.cheatDay ? "🍷 Cheat day" : ""}</div>
                <div>Total kcal: {day.totalKcal}</div>
                <div>Water: {day.waterMl} ml</div>
                <div style={{ color: day.inBudget ? COLORS.olive : COLORS.wine }}>Budget: {day.inBudget ? "Within" : "Over"}</div>
              </button>
            ))}
          </section>
        )}

        {tab === "Weight" && (
          <section className="rtw-grid cols-2">
            <div className="rtw-card">
              <h2 className="rtw-title">Weight tracker</h2>
              <input className="rtw-input" type="date" value={weightForm.date} onChange={(e) => setWeightForm((s) => ({ ...s, date: e.target.value }))} />
              <input className="rtw-input" type="number" step="0.1" placeholder="kg" value={weightForm.kg} onChange={(e) => setWeightForm((s) => ({ ...s, kg: e.target.value }))} />
              <button className="rtw-btn" onClick={addWeight}>Add weekly weight</button>
              <div style={{ marginTop: 10 }}>Loss from start: {(Number(data.settings.startWeight) - latestWeight).toFixed(1)} kg</div>
              {weightSorted.map((w) => <div key={w.id}>{w.date}: {w.kg} kg</div>)}
            </div>

            <div className="rtw-card">
              <h2 className="rtw-title">Milestones</h2>
              <input className="rtw-input" placeholder="Name" value={milestoneForm.name} onChange={(e) => setMilestoneForm((s) => ({ ...s, name: e.target.value }))} />
              <input className="rtw-input" type="date" value={milestoneForm.date} onChange={(e) => setMilestoneForm((s) => ({ ...s, date: e.target.value }))} />
              <input className="rtw-input" type="number" step="0.1" placeholder="Target weight (kg)" value={milestoneForm.targetWeight} onChange={(e) => setMilestoneForm((s) => ({ ...s, targetWeight: e.target.value }))} />
              <textarea className="rtw-input" rows={2} placeholder="Description" value={milestoneForm.description} onChange={(e) => setMilestoneForm((s) => ({ ...s, description: e.target.value }))} />
              <button className="rtw-btn" onClick={addMilestone}>Add milestone</button>

              {data.milestones.map((m) => {
                const daysLeft = dayDiff(m.date, TODAY);
                const reachable = latestWeight >= m.targetWeight && daysLeft >= 0;
                return (
                  <div key={m.id} className="rtw-card" style={{ background: COLORS.parchment }}>
                    <strong>{m.name}</strong> ({m.targetWeight}kg)
                    <div>{m.date} • {daysLeft >= 0 ? `${daysLeft} day(s) left` : "Date passed"}</div>
                    <div style={{ color: reachable ? COLORS.olive : COLORS.orange }}>
                      {reachable ? "Reachable" : "Challenging"}
                    </div>
                    <div>Distance: {(latestWeight - m.targetWeight).toFixed(1)} kg</div>
                    <div style={{ color: COLORS.mid }}>{m.description}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === "Settings" && (
          <section className="rtw-card">
            <h2 className="rtw-title">Targets & settings</h2>
            <label>Daily kcal budget</label>
            <input className="rtw-input" type="number" value={data.settings.kcalBudget} onChange={(e) => setData((p) => ({ ...p, settings: { ...p.settings, kcalBudget: Number(e.target.value) } }))} />
            <label>Daily water target (ml)</label>
            <input className="rtw-input" type="number" value={data.settings.waterTarget} onChange={(e) => setData((p) => ({ ...p, settings: { ...p.settings, waterTarget: Number(e.target.value) } }))} />
            <label>Start weight (kg)</label>
            <input className="rtw-input" type="number" step="0.1" value={data.settings.startWeight} onChange={(e) => setData((p) => ({ ...p, settings: { ...p.settings, startWeight: Number(e.target.value) } }))} />
            <label>Start date</label>
            <input className="rtw-input" type="date" value={data.settings.startDate} onChange={(e) => setData((p) => ({ ...p, settings: { ...p.settings, startDate: e.target.value } }))} />
            <label>Typical hydration pattern</label>
            <select className="rtw-input" value={data.settings.hydrationPattern} onChange={(e) => setData((p) => ({ ...p, settings: { ...p.settings, hydrationPattern: e.target.value } }))}>
              {hydrationPatterns.map((pattern) => <option key={pattern} value={pattern}>{pattern}</option>)}
            </select>
          </section>
        )}
      </div>
    </div>
  );
}
