import { useEffect, useState } from "react";
import {
  LayoutDashboard, Target, BarChart3, User, History, Download, FileText, Calendar, Trash2, ShieldCheck, PieChart, TrendingUp, Settings, Wallet, CreditCard, Activity
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

const API = "https://backend-2-d4e9.onrender.com";

const categories = [
  "🍔 Food","⚡ Utilities","🏠 Rent","🎓 Education",
  "🎬 Entertainment","🚌 Transport","🏥 Health","👕 Clothing",
  "📱 Subscriptions","🛒 Groceries","💻 Tech","✈️ Travel"
];

export default function App() {

  const [user,setUser]=useState(null);
  const [expenses,setExpenses]=useState([]);
  const [activeTab,setActiveTab]=useState("dashboard");

  const [goals,setGoals]=useState([]);
  const [goalForm,setGoalForm]=useState({
    name:"",target:"",saved:"",monthly:""
  });

  const [budgets,setBudgets]=useState({});
  const [overallBudget,setOverallBudget]=useState(500);

  const [form,setForm]=useState({
    description:"",amount:"",category:"🍔 Food"
  });

  const [archives, setArchives] = useState([]);

  // 🔐 AUTH & REGISTRATION STATE
  const [isRegistering, setIsRegistering] = useState(false);
  const [auth,setAuth]=useState({
    username:"",
    password:"",
    error:"",
    success:""
  });

  // 🔐 AUTH FUNCTIONS
  const handleAuth = async () => {
    setAuth({...auth, error: "", success: ""});
    const endpoint = isRegistering ? "/register/" : "/login/";
    
    try {
      const res = await fetch(API + endpoint, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ username: auth.username, password: auth.password })
      });

      const data = await res.json();

      if (isRegistering) {
        if (res.ok) {
          setAuth({...auth, success: "Account created! You can now login.", username: ""});
          setIsRegistering(false);
        } else {
          setAuth({...auth, error: data.detail || "Registration failed"});
        }
      } else {
        if (data.id) {
          setUser(data);
          setAuth({username:"", password:"", error:"", success:""});
        } else {
          setAuth({...auth, error: "Invalid credentials"});
        }
      }
    } catch (err) {
      setAuth({...auth, error: "Server connection failed"});
    }
  };

  const loadData=()=>{
    if(!user) return;
    fetch(API+`/expenses/${user.id}/`)
    .then(res=>res.json()).then(setExpenses);
  };

  useEffect(()=>{loadData()},[user]);

  const addExpense=async()=>{
    if(!form.amount || isNaN(form.amount)) return;

    await fetch(API+"/expenses/add/",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        user_id:user.id,
        amount:Number(form.amount),
        category:form.category,
        description:form.description
      })
    });

    setForm({description:"",amount:"",category:"🍔 Food"});
    loadData();
  };

  const categoryTotal=(cat, data = expenses)=>
    data.filter(e=>e.category===cat)
    .reduce((a,b)=>a+b.amount,0);

  const totalSpent = expenses.reduce((a,b)=>a+b.amount,0);
  const remaining = overallBudget - totalSpent;

  const chartData = categories.map(cat => ({
    name: cat,
    amount: categoryTotal(cat)
  }));

  const calculateDaysLeft = (spent, limit) => {
    if (!limit || limit <= 0 || spent <= 0) return null;
    if (spent >= limit) return 0;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysPassed = Math.max(1, Math.ceil((today - startOfMonth) / (1000 * 60 * 60 * 24)));
    const dailyRate = spent / daysPassed;
    const remainingAmount = limit - spent;
    return Math.floor(remainingAmount / dailyRate);
  };

  const overallDaysLeft = calculateDaysLeft(totalSpent, overallBudget);

  const insights = categories.map(cat=>{
    const spent = categoryTotal(cat);
    const limit = budgets[cat] || 0;
    const daysLeft = calculateDaysLeft(spent, limit);
    if(limit && spent > limit) return `🚨 ${cat} is over budget — cut back here`;
    if(limit && daysLeft !== null && daysLeft <= 7) return `⚠️ ${cat} budget will likely run out in ${daysLeft} days!`;
    if(spent > totalSpent * 0.3) return `💡 ${cat} is taking a big chunk of your spending`;
    return null;
  }).filter(Boolean);

  if (overallDaysLeft !== null) {
      if (overallDaysLeft <= 5 && overallDaysLeft > 0) insights.unshift(`📉 ALERT: Total budget predicted to run out in ${overallDaysLeft} days!`);
      else if (overallDaysLeft === 0) insights.unshift(`🛑 Alert: Total budget velocity has been reached.`);
  }

  if(insights.length===0) insights.push("✅ Your spending looks balanced. Keep it up!");

  const saveAndResetMonth = async () => {
    if (!window.confirm("Save this month's data to archives and reset?")) return;
    const report = {
      id: Date.now(),
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      date: new Date().toISOString(),
      total: totalSpent,
      data: [...expenses],
      breakdown: categories.map(c => ({ name: c, amount: categoryTotal(c) }))
    };
    setArchives(prev => [...prev, report]);
    setExpenses([]);
    setBudgets({});
    setOverallBudget(500);
    await fetch(API+"/reset/",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({user_id:user.id})
    });
    loadData();
    alert("Month archived and reset successfully!");
  };

  const nuclearReset = async () => {
    if (!window.confirm("🚨 WARNING: This will permanently delete ALL data, including your Yearly Wrapped and Archive History. Are you absolutely sure?")) return;
    setExpenses([]); setGoals([]); setBudgets({}); setArchives([]); setOverallBudget(500);
    await fetch(API+"/reset/",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({user_id:user.id})
    });
    loadData();
  };

  const downloadPDF = (reportName, content) => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${reportName}.json`; a.click();
  };

  const getYearlyWrapped = () => {
    const yearlyData = {};
    archives.forEach(month => {
      month.data.forEach(exp => {
        yearlyData[exp.category] = (yearlyData[exp.category] || 0) + exp.amount;
      });
    });
    return Object.keys(yearlyData).map(cat => ({ name: cat, amount: yearlyData[cat] }));
  };

  // --- 🔐 ENHANCED LOGIN/REGISTER SCREEN ---
  if(!user){
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-[#020617] text-white">
        {/* Left Side: Info */}
        <div className="md:w-1/2 p-6 md:p-12 flex flex-col justify-center bg-gradient-to-br from-purple-900/20 to-transparent border-r border-white/5">
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}}>
            <h1 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              SpendSmart
            </h1>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              The ultimate financial command center for students and traders. Track, analyze, and master your money with precision.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-600/20 rounded-lg text-purple-400"><TrendingUp size={24}/></div>
                <div>
                  <h3 className="font-bold text-white">Predictive Analytics</h3>
                  <p className="text-sm text-gray-400">Our engine calculates your "burn rate" and predicts exactly when your budget will run out.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-600/20 rounded-lg text-blue-400"><PieChart size={24}/></div>
                <div>
                  <h3 className="font-bold text-white">Yearly Wrapped</h3>
                  <p className="text-sm text-gray-400">Archive monthly data to unlock a full visual breakdown of your yearly financial habits.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-600/20 rounded-lg text-green-400"><ShieldCheck size={24}/></div>
                <div>
                  <h3 className="font-bold text-white">Secure Archives</h3>
                  <p className="text-sm text-gray-400">Save detailed PDF-ready reports of every transaction with timestamps and categories.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-1/2 flex items-center justify-center p-4 md:p-8">
          <motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-white/5 p-5 md:p-10 rounded-2xl w-full max-w-md border border-white/10 backdrop-blur-md">
            <h2 className="text-2xl font-bold mb-2 text-center">{isRegistering ? "Create Account" : "Welcome Back"}</h2>
            <p className="text-gray-500 text-center mb-8 text-sm">Enter your details to access your dashboard</p>

            <div className="space-y-4">
              <input placeholder="Username" value={auth.username} onChange={e=>setAuth({...auth,username:e.target.value})} className="w-full p-3 bg-black/40 rounded-lg border border-white/10 focus:border-purple-500 outline-none transition"/>
              <input type="password" placeholder="Password" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})} className="w-full p-3 bg-black/40 rounded-lg border border-white/10 focus:border-purple-500 outline-none transition"/>
              
              {auth.error && <p className="text-red-400 text-sm text-center font-medium bg-red-400/10 py-2 rounded">{auth.error}</p>}
              {auth.success && <p className="text-green-400 text-sm text-center font-medium bg-green-400/10 py-2 rounded">{auth.success}</p>}

              <button onClick={handleAuth} className="w-full bg-purple-600 hover:bg-purple-700 p-3 rounded-lg font-bold transition-all shadow-lg shadow-purple-600/20">
                {isRegistering ? "Sign Up" : "Login"}
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-gray-400">
              {isRegistering ? "Already have an account?" : "New here?"}
              <button onClick={() => setIsRegistering(!isRegistering)} className="ml-2 text-purple-400 font-bold hover:underline">
                {isRegistering ? "Login" : "Register Now"}
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  const logout = () => setUser(null);

  return (
    <div className="flex flex-col md:flex-row min-h-screen text-white bg-gradient-to-br from-[#020617] via-[#0f172a] to-black overflow-x-hidden">

      {/* SIDEBAR */}
      <div className="w-full md:w-64 p-5 backdrop-blur-xl bg-white/5 border-r border-white/10">
        <div className="mb-8">
          <h1 className="text-xl font-bold">💰 SpendSmart</h1>
          <p className="text-xs text-purple-400 font-medium">Welcome, {user.username}</p>
        </div>
        
        <button onClick={logout} className="mb-4 w-full bg-red-500/10 border border-red-500/50 text-red-400 p-2 rounded hover:bg-red-500 hover:text-white transition">Logout</button>

        {[
          {id:"dashboard",icon:LayoutDashboard,label:"Dashboard"},
          {id:"goals",icon:Target,label:"Savings Goals"},
          {id:"budgets",icon:BarChart3,label:"Budgets"},
          {id:"history",icon:History,label:"History"},
          {id:"reports",icon:Download,label:"Reports & Wrapped"},
          {id:"profile",icon:User,label:"Profile"}
        ].map(tab=>{
          const Icon=tab.icon;
          return(
            <motion.div key={tab.id}
              whileHover={{x:5}}
              onClick={()=>setActiveTab(tab.id)}
              className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer mb-2
              ${activeTab===tab.id?"bg-gradient-to-r from-purple-600 to-blue-500 shadow-lg":"hover:bg-white/10"}`}>
              <Icon size={18}/> {tab.label}
            </motion.div>
          )
        })}

        <div className="mt-6">
          <p className="text-sm text-gray-400">💰 Monthly Budget</p>
          <input value={overallBudget} onChange={e=>setOverallBudget(Number(e.target.value))} className="w-full p-2 bg-black/40 rounded mt-1"/>
          <p className={`mt-2 font-bold ${remaining < 0 ? "text-red-400" : "text-green-400"}`}>
            {remaining < 0 ? `🚨 Over KSh ${Math.abs(remaining)}` : `✅ KSh ${remaining} left`}
          </p>
        </div>

        <button onClick={nuclearReset} className="w-full mt-10 flex items-center justify-center gap-2 bg-red-600 p-3 rounded-lg hover:bg-red-700 transition font-bold"><Trash2 size={18}/> Reset All Data</button>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">Hello, {user.username} 👋</h1>

        {activeTab==="dashboard" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
              <div className="p-6 bg-white/5 rounded-xl"><p>💸 Gross Expenditure</p><h2 className="text-pink-400 text-2xl font-bold">KSh {totalSpent}</h2></div>
              <div className="p-6 bg-white/5 rounded-xl"><p>📊 Status</p><h2 className={remaining<0?"text-red-400":"text-green-400"}>KSh {remaining}</h2></div>
              <div className="p-6 bg-white/5 rounded-xl"><p>🧾 Transactions</p><h2 className="text-yellow-400 text-2xl font-bold">{expenses.length}</h2></div>
            </div>
            <div className="p-5 mb-6 bg-white/5 rounded-xl"><h2 className="mb-2">🤖 Smart Insights</h2>{insights.map((i,idx)=>(<p key={idx} className="text-yellow-300">{i}</p>))}</div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 p-6 bg-white/5 rounded-xl"><h2>🧾 New Transaction</h2>
                <input placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="w-full mb-2 p-2 bg-black/40 rounded"/>
                <input placeholder="Amount" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="w-full mb-2 p-2 bg-black/40 rounded"/>
                <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full mb-3 p-2 bg-black/40 rounded">{categories.map(c=><option key={c}>{c}</option>)}</select>
                <button onClick={addExpense} className="w-full bg-purple-600 p-2 rounded">Commit</button>
              </div>
              {/* FIXED SCROLLABLE CHART CONTAINER */}
              <div className="p-4 md:p-6 bg-white/5 rounded-xl h-[300px] md:h-[320px] overflow-y-auto">
                <div style={{ height: `${categories.length * 40}px`, minWidth: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={chartData} margin={{ left: 20 }}>
                      <CartesianGrid stroke="#444" horizontal={false}/>
                      <XAxis type="number" hide/>
                      <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: '#ccc'}}/>
                      <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px'}} />
                      <Bar dataKey="amount" fill="#7c3aed" radius={[0, 4, 4, 0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab==="reports" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 p-4 bg-purple-900/20 rounded-xl border border-purple-500/30">
              <div><h2 className="text-2xl font-bold">Monthly Report</h2><p className="text-gray-400">Archive current data to view in Yearly Wrapped</p></div>
              <button onClick={saveAndResetMonth} className="flex items-center gap-2 bg-purple-600 px-4 py-2 rounded-lg font-bold hover:bg-purple-700"><FileText size={20}/> Save & Reset Month</button>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="p-6 bg-white/5 rounded-xl">
                <div className="flex justify-between mb-4"><h2 className="text-xl font-bold flex items-center gap-2"><Calendar className="text-pink-400"/> Yearly Wrapped</h2><button onClick={()=>downloadPDF("Yearly_Wrapped", getYearlyWrapped())} className="text-xs bg-white/10 p-2 rounded hover:bg-white/20">Download Report</button></div>
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={getYearlyWrapped()}><CartesianGrid strokeDasharray="3 3" stroke="#333"/><XAxis dataKey="name" hide/><YAxis /><Tooltip /><Bar dataKey="amount" fill="#ec4899"/></BarChart></ResponsiveContainer></div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">{getYearlyWrapped().map(w => (<div key={w.name} className="flex justify-between p-2 bg-white/5 rounded"><span>{w.name}</span><span className="font-bold">KSh {w.amount}</span></div>))}</div>
              </div>
              <div className="p-6 bg-white/5 rounded-xl overflow-y-auto max-h-[500px]">
                <h2 className="text-xl font-bold mb-4">Archive History</h2>
                {archives.length === 0 ? <p className="text-gray-500 italic">No months archived yet.</p> : (archives.map(archive => (
                    <div key={archive.id} className="p-4 mb-3 border border-white/10 rounded-lg hover:bg-white/5 transition"><div className="flex justify-between items-center"><h3 className="font-bold">{archive.month}</h3><span className="text-green-400">Total: KSh {archive.total}</span></div><div className="mt-2 flex gap-2"><button onClick={() => downloadPDF(`Report_${archive.month}`, archive)} className="text-[10px] bg-blue-600/30 text-blue-300 px-2 py-1 rounded">Download Details</button><details className="text-[10px] cursor-pointer bg-white/10 px-2 py-1 rounded"><summary>View Breakdown</summary><div className="mt-2 space-y-1">{archive.data.map((ex, idx) => (<div key={idx} className="flex justify-between border-b border-white/5 py-1"><span>{new Date(ex.date_created || ex.timestamp).toLocaleDateString()} - {ex.description}</span><span>KSh {ex.amount}</span></div>))}</div></details></div></div>
                )))}
              </div>
            </div>
          </div>
        )}

        {activeTab==="history" && (
          <div className="p-6 bg-white/5 rounded-xl">
            <h2 className="text-xl mb-4">📜 Expense History</h2>
            <div className="space-y-1">
              {expenses.slice().reverse().map((e,i)=>(
                <div key={i} className="flex justify-between items-center border-b border-white/10 py-3 hover:bg-white/5 px-2 transition rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-white">{e.description || "Unnamed Expense"}</p>
                    <div className="flex gap-3 text-xs text-gray-400 mt-1">
                      <span className="bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full">{e.category}</span>
                      <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(e.date_created).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-purple-400 font-bold ml-4 text-lg">KSh {e.amount}</p>
                </div>
              ))}
              {expenses.length === 0 && <p className="text-gray-500 text-center py-10 italic">No transactions found.</p>}
            </div>
          </div>
        )}

        {activeTab==="goals" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="p-6 bg-white/5 rounded-xl">
              <h2 className="text-xl font-bold mb-3">💰 Savings Goals</h2>
              {["name","target","saved","monthly"].map(field=>(
                <input key={field} placeholder={field} value={goalForm[field]} onChange={e=>setGoalForm({...goalForm,[field]:e.target.value})} className="w-full p-3 mt-2 bg-black/40 rounded"/>
              ))}
              <button onClick={()=>{if(!goalForm.name || !goalForm.target) return; setGoals(prev=>[...prev,{name:goalForm.name,target:+goalForm.target,saved:+goalForm.saved||0,monthly:+goalForm.monthly||0}]); setGoalForm({name:"",target:"",saved:"",monthly:""});}} className="w-full mt-3 bg-blue-600 p-3 rounded">➕ Add Goal</button>
            </div>
            <div>{goals.map((g,i)=>{const remaining=g.target-g.saved; const months=g.monthly?Math.ceil(remaining/g.monthly):0; return(<div key={i} className="p-5 mb-4 bg-white/5 rounded-xl"><h3 className="text-lg font-bold mb-3">🎯 {g.name}</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"><p className="text-blue-400">🎯 Target: {g.target}</p><p className="text-green-400">💰 Saved: {g.saved}</p><p className="text-yellow-400">📉 Remaining: {remaining}</p><p className="text-purple-400">⏳ Months: {months}</p></div><input placeholder="➕ Update saved" className="w-full mt-3 p-2 bg-black/40 rounded" onChange={(e)=>{const newGoals=[...goals]; newGoals[i].saved=Number(e.target.value); setGoals(newGoals);}}/>{remaining<=0 && (<p className="text-green-400 mt-3 font-bold text-lg">🎉🔥 LEGEND! You crushed your goal! 🚀💰</p>)}</div>)})}</div>
          </div>
        )}

        {activeTab==="budgets" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map(cat=>{
              const spent=categoryTotal(cat); const limit=budgets[cat]||0; const daysRemaining = calculateDaysLeft(spent, limit);
              return(<div key={cat} className="p-4 bg-white/5 rounded-xl"><h3>{cat}</h3><input placeholder="Limit" onChange={e=>setBudgets({...budgets,[cat]:Number(e.target.value)})} className="w-full p-2 mt-2 bg-black/40 rounded"/><p className={spent>limit?"text-red-400":"text-green-400"}>{spent} / {limit}</p>{limit > 0 && spent < limit && daysRemaining !== null && (<p className="text-xs text-blue-300 mt-1 italic">{daysRemaining} days until over budget</p>)}</div>)
            })}
          </div>
        )}

        {activeTab==="profile" && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} className="max-w-4xl mx-auto space-y-6">
            <div className="p-6 md:p-8 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-3xl font-bold border-4 border-white/10">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-3xl font-bold">{user.username}</h2>
                <p className="text-purple-400 font-medium">Financial Command Member</p>
                <div className="flex gap-4 mt-2">
                  <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 flex items-center gap-1"><Activity size={12}/> Active Session</span>
                  <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 flex items-center gap-1"><ShieldCheck size={12}/> Verified Student Account</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="p-6 bg-white/5 rounded-xl border border-white/5">
                <Wallet className="text-blue-400 mb-2" size={24}/>
                <p className="text-gray-400 text-sm">Monthly Allocation</p>
                <h3 className="text-xl font-bold">KSh {overallBudget}</h3>
              </div>
              <div className="p-6 bg-white/5 rounded-xl border border-white/5">
                <CreditCard className="text-purple-400 mb-2" size={24}/>
                <p className="text-gray-400 text-sm">Average Expense</p>
                <h3 className="text-xl font-bold">KSh {expenses.length ? (totalSpent / expenses.length).toFixed(2) : 0}</h3>
              </div>
              <div className="p-6 bg-white/5 rounded-xl border border-white/5">
                <Settings className="text-green-400 mb-2" size={24}/>
                <p className="text-gray-400 text-sm">System Rank</p>
                <h3 className="text-xl font-bold">{totalSpent > overallBudget ? "Over-Leveraged" : "Prime Saver"}</h3>
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/5">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings size={18}/> Account Settings</h3>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 p-4 bg-black/20 rounded-lg">
                  <div>
                    <p className="font-bold">Export Personal Data</p>
                    <p className="text-xs text-gray-400">Download all transaction logs as a single JSON file</p>
                  </div>
                  <button onClick={() => downloadPDF("Full_Data_Export", {user, expenses, archives})} className="bg-white/10 px-4 py-2 rounded text-sm hover:bg-white/20 transition">Export</button>
                </div>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 p-4 bg-black/20 rounded-lg border border-red-500/10">
                  <div>
                    <p className="font-bold text-red-400">System Reset</p>
                    <p className="text-xs text-gray-400">Wipe all local and cloud data associated with this ID</p>
                  </div>
                  <button onClick={nuclearReset} className="bg-red-500/10 text-red-400 px-4 py-2 rounded text-sm hover:bg-red-500 hover:text-white transition">Reset</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
