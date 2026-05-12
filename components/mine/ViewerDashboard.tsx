// // "use client";

// // import { motion, AnimatePresence } from 'framer-motion';
// // import { RefreshCw, Zap } from 'lucide-react';
// // import { useState, useEffect } from 'react';
// // import { RaceData } from '@/app/types';
// // import { storage } from '@/lib/storage';

// // export default function ViewerDashboard() {
// //   const [data, setData] = useState<RaceData>(storage.load());
// //   const [isRefreshing, setIsRefreshing] = useState(false);

// //   const handleRefresh = () => {
// //     setIsRefreshing(true);
// //     // Simulate network delay
// //     setTimeout(() => {
// //       setData(storage.load());
// //       setIsRefreshing(false);
// //     }, 600);
// //   };

// //   useEffect(() => {
// //     // Initial fetch
// //     setData(storage.load());
// //   }, []);

// //   const sortedPositions = [...data.positions].sort((a, b) => b.score - a.score);
// //   const topFive = sortedPositions.slice(0, 5);
// //   // const others = sortedPositions.slice(5);

// //   // Dynamic Scale: Calculate max achieved score for normalization
// //   const maxScoreAchieved = Math.max(1, ...data.positions.map(p => p.score));
// //   const visualTarget = data.state.status === 'finished' ? maxScoreAchieved : Math.max(10, maxScoreAchieved * 1.1);

// //   return (
// //     <div className="h-screen bg-brand-slate-dark text-slate-100 flex flex-col p-6 font-mono overflow-hidden">
// //       {/* Header */}
// //       <header className="flex justify-between items-end mb-6 border-b-2 border-brand-slate-border pb-4 shrink-0">
// //         <div>
// //           <h1 className="text-4xl font-black italic skew-x-[-10deg] neon-text tracking-tighter uppercase">
// //             Astro <span className="text-white">Party</span>
// //           </h1>
// //           <div className="flex gap-4 mt-1">
// //             <span className="text-[9px] uppercase tracking-widest text-slate-500">
// //               UPLINK: <span className="text-brand-green border border-brand-green/20 px-1">ACTIVE</span>
// //             </span>
// //             <span className="text-[9px] uppercase tracking-widest text-slate-500">
// //               FIELD: <span className="text-brand-cyan">DYNAMIC RANGE</span>
// //             </span>
// //           </div>
// //         </div>

// //         <div className="flex items-center gap-4">
// //           <div className="px-3 py-1 bg-brand-slate-mid border border-brand-slate-border rounded-sm text-[10px] font-bold uppercase tracking-widest text-brand-cyan">
// //              ROUND {data.state.round} • <span className={data.state.status === 'finished' ? 'text-brand-green' : ''}>{data.state.status.toUpperCase()}</span>
// //           </div>
// //           <button
// //             onClick={handleRefresh}
// //             disabled={isRefreshing}
// //             className="flex items-center gap-2 px-4 py-2 bg-brand-cyan text-brand-slate-dark font-black uppercase text-xs tracking-widest hover:scale-105 transition-all disabled:opacity-50"
// //           >
// //             <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
// //             Sync
// //           </button>
// //         </div>
// //       </header>

// //       {/* Main Container: Track + Sidebar */}
// //       <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
// //         {/* Track Area */}
// //         <div className="flex-[3] relative border-2 border-brand-slate-border bg-black/40 backdrop-blur-sm overflow-hidden rounded-lg">
// //           {/* Background Grid */}
// //           <div
// //             className="absolute inset-0 opacity-10"
// //             style={{
// //               backgroundImage: `linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)`,
// //               backgroundSize: '40px 40px'
// //             }}
// //           />          {/* Scale Marks */}
// //           <div className="absolute bottom-0 left-12 right-24 h-6 border-t border-brand-slate-border flex justify-between px-2">
// //             {[0, 0.25, 0.5, 0.75, 1].map((p) => (
// //               <div key={p} className="flex flex-col items-center">
// //                 <div className="h-2 w-px bg-brand-slate-border" />
// //                 <span className="text-[8px] text-slate-500 mt-1">{Math.floor(p * visualTarget)}</span>
// //               </div>
// //             ))}
// //           </div>

// //           {/* Spaceships (Top 5 Only) */}
// //           <div className="absolute inset-x-0 bottom-6 top-0 pl-12 pr-24 py-8">
// //             <AnimatePresence>
// //               {topFive.map((pos, index) => {
// //                 const team = data.teams.find(t => t.id === pos.teamId);
// //                 if (!team) return null;

// //                 // Position Y based on rank (0-4 for top 5)
// //                 const yPos = (index + 0.5) * (100 / 5);

// //                 return (
// //                   <motion.div
// //                     key={team.id}
// //                     layoutId={team.id}
// //                     initial={false}
// //                     animate={{
// //                       left: `${Math.min(100, (pos.score / visualTarget) * 100)}%`,
// //                       top: `${yPos}%`
// //                     }}
// //                     transition={{ type: "spring", stiffness: 40, damping: 15 }}
// //                     className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
// //                   >
// //                     <div className="group relative flex flex-col items-center">
// //                       {/* Labels and Score Grouped ABOVE Ship */}
// //                       <div className="absolute bottom-full mb-3 flex flex-col items-center gap-1 group-hover:scale-110 transition-transform">
// //                          {/* Rank and Name */}
// //                          <div
// //                           className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-brand-slate-dark/95 border rounded flex items-center gap-2 whitespace-nowrap ${pos.score >= visualTarget && data.state.status === 'finished' ? 'border-brand-green bg-brand-green/20' : ''}`}
// //                           style={{ borderColor: pos.score >= visualTarget && data.state.status === 'finished' ? '#4ade80' : `${team.color}66`, color: pos.score >= visualTarget && data.state.status === 'finished' ? '#4ade80' : team.color }}
// //                         >
// //                           <span className="opacity-50">#{index + 1}</span> {team.name}
// //                           {pos.score >= visualTarget && data.state.status === 'finished' && <Zap className="w-2 h-2 animate-pulse" />}
// //                         </div>
// //                         {/* Score Tag */}
// //                         <div className="text-[10px] font-black text-white tabular-nums bg-brand-slate-mid/60 px-1.5 rounded-sm border border-white/5">
// //                           {pos.score} <span className="text-[7px] text-slate-500">P</span>
// //                         </div>
// //                       </div>

// //                       {/* Ship Graphics */}
// //                       <div
// //                         className="w-10 h-7 [clip-path:polygon(0%_0%,100%_50%,0%_100%,25%_50%)] shadow-[0_0_20px_currentColor]"
// //                         style={{ backgroundColor: team.color, color: team.color }}
// //                       />
// //                     </div>
// //                   </motion.div>
// //                 );
// //               })}
// //             </AnimatePresence>

// //             {topFive.length === 0 && (
// //               <div className="absolute inset-0 flex items-center justify-center text-slate-600 uppercase text-[10px] tracking-widest italic opacity-30">
// //                 Awaiting fleet transmission...
// //               </div>
// //             )}
// //           </div>
// //         </div>

// //         {/* Sidebar: Ranking List for others */}
// //         <div className="flex-1 min-w-[280px] bg-brand-slate-mid/50 border-2 border-brand-slate-border rounded-lg flex flex-col min-h-0 overflow-hidden">
// //           <div className="p-4 border-b border-brand-slate-border bg-brand-slate-mid">
// //             <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-cyan flex items-center justify-between">
// //               Fleet Rankings
// //               <span className="text-[10px] text-slate-500">LIVE</span>
// //             </h2>
// //           </div>

// //           <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
// //             {sortedPositions.map((pos, index) => {
// //               const team = data.teams.find(t => t.id === pos.teamId);
// //               if (!team) return null;
// //               const isTopFive = index < 5;

// //               return (
// //                 <div
// //                   key={team.id}
// //                   className={`flex items-center justify-between p-3 border rounded transition-all ${isTopFive ? 'bg-brand-cyan/5 border-brand-cyan/20' : 'bg-black/20 border-white/5'}`}
// //                 >
// //                   <div className="flex items-center gap-3">
// //                     <span className={`text-[10px] font-bold w-4 ${index < 3 ? 'text-brand-green' : 'text-slate-500'}`}>
// //                       {index + 1}
// //                     </span>
// //                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
// //                     <span className="text-[11px] font-bold uppercase truncate max-w-[120px]">
// //                       {team.name}
// //                     </span>
// //                   </div>
// //                   <div className="flex items-center gap-3">
// //                     <div className="text-[10px] font-mono text-slate-400">
// //                       {pos.score} <span className="text-[8px]">PTS</span>
// //                     </div>
// //                   </div>
// //                 </div>
// //               );
// //             })}
// //             {data.teams.length === 0 && (
// //               <div className="p-8 text-center text-[10px] text-slate-600 uppercase italic">No data</div>
// //             )}
// //           </div>
// //         </div>
// //       </div>

// //       {/* Footer Info */}
// //       <footer className="mt-4 flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-widest shrink-0">
// //         <div className="flex gap-6">
// //           <span>Total Fleet: {data.teams.length}</span>
// //           <span>Lead Pilot: {
// //             data.positions.length > 0
// //               ? data.teams.find(t => t.id === sortedPositions[0].teamId)?.name
// //               : 'NONE'
// //           }</span>
// //         </div>
// //         <div className="flex items-center gap-4">
// //           <a href="/admin" className="text-brand-cyan/30 hover:text-brand-cyan transition-colors underline decoration-dotted underline-offset-4">ADMIN_LINK</a>
// //           <div className="flex items-center gap-2">
// //             <Zap className="w-3 h-3 text-brand-cyan" />
// //             <span>Sync Control: Manual</span>
// //           </div>
// //         </div>
// //       </footer>
// //     </div>
// //   );
// // }
// "use client";

// import { motion, AnimatePresence } from "framer-motion";
// import { RefreshCw, Zap, X } from "lucide-react";
// import { useState, useEffect, useCallback } from "react";
// import { RaceData } from "@/app/types";
// import { loadData, loadCategories, loadScoreEvents } from "@/lib/db";

// // ── Types ─────────────────────────────────────────────────────────────────────
// interface Question {
//   id: number;
//   number: number;
// }
// interface Category {
//   id: number;
//   name: string;
//   position: number;
//   questions: Question[];
// }
// interface ScoreEvent {
//   id: string;
//   team_id: string;
//   question_id: number;
//   delta: number;
// }

// // ── Jeopardy Cell ─────────────────────────────────────────────────────────────
// function JeopardyCell({
//   question,
//   events,
//   teams,
//   onClick,
// }: {
//   question: Question;
//   events: ScoreEvent[];
//   teams: RaceData["teams"];
//   onClick: () => void;
// }) {
//   const answered = events.length > 0;

//   return (
//     <button
//       onClick={onClick}
//       className={`
//         relative w-full border text-center transition-all duration-300
//         flex flex-col items-center justify-center gap-1 group overflow-hidden
//         min-h-[64px] py-2 px-1
//         ${
//           answered
//             ? "bg-brand-slate-dark/60 border-brand-slate-border/30 opacity-60 cursor-pointer"
//             : "bg-black/40 border-brand-slate-border hover:border-brand-cyan/60 hover:bg-brand-cyan/5 cursor-pointer"
//         }
//       `}
//     >
//       {/* Hover glow (unanswered only) */}
//       {!answered && (
//         <div
//           className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
//           style={{
//             background:
//               "radial-gradient(circle at center, rgba(34,211,238,0.07) 0%, transparent 70%)",
//           }}
//         />
//       )}

//       {answered ? (
//         // Answered: team chips
//         <div className="flex flex-col gap-0.5 w-full">
//           {events.map((ev) => {
//             const team = teams.find((t) => t.id === ev.team_id);
//             if (!team) return null;
//             return (
//               <div
//                 key={ev.id}
//                 className="flex items-center justify-between px-1.5 py-0.5 rounded text-[8px] font-bold"
//                 style={{
//                   backgroundColor: `${team.color}20`,
//                   borderLeft: `2px solid ${team.color}`,
//                   color: ev.delta > 0 ? team.color : "#f87171",
//                 }}
//               >
//                 <span className="truncate max-w-[50px]">{team.name}</span>
//                 <span className="ml-1 tabular-nums shrink-0">
//                   {ev.delta > 0 ? `+${ev.delta}` : ev.delta}
//                 </span>
//               </div>
//             );
//           })}
//         </div>
//       ) : (
//         // Unanswered: question number
//         <span className="text-[11px] font-black text-slate-400 group-hover:text-brand-cyan transition-colors">
//           ข้อ {question.number}
//         </span>
//       )}

//       {/* Answered dot */}
//       {answered && (
//         <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-600" />
//       )}
//     </button>
//   );
// }

// // ── Question Detail Modal ─────────────────────────────────────────────────────
// function QuestionModal({
//   category,
//   question,
//   events,
//   teams,
//   onClose,
// }: {
//   category: Category;
//   question: Question;
//   events: ScoreEvent[];
//   teams: RaceData["teams"];
//   onClose: () => void;
// }) {
//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
//       onClick={onClose}
//     >
//       <motion.div
//         initial={{ scale: 0.9, opacity: 0, y: 12 }}
//         animate={{ scale: 1, opacity: 1, y: 0 }}
//         exit={{ scale: 0.9, opacity: 0, y: 12 }}
//         transition={{ type: "spring", stiffness: 300, damping: 28 }}
//         className="relative bg-brand-slate-dark border-2 border-brand-slate-border rounded-lg p-8 w-[440px] max-w-[90vw] shadow-[0_0_60px_rgba(34,211,238,0.12)]"
//         onClick={(e) => e.stopPropagation()}
//       >
//         {/* Close */}
//         <button
//           onClick={onClose}
//           className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
//         >
//           <X className="w-4 h-4" />
//         </button>

//         {/* Header */}
//         <div className="mb-6">
//           <p className="text-[9px] uppercase tracking-[0.25em] text-brand-cyan mb-1">
//             {category.name}
//           </p>
//           <h3 className="text-2xl font-black text-white">ข้อ {question.number}</h3>
//         </div>

//         {/* Events */}
//         {events.length === 0 ? (
//           <div className="py-10 text-center border border-dashed border-brand-slate-border rounded">
//             <p className="text-[10px] text-slate-600 uppercase tracking-widest italic">
//               ยังไม่มีการให้คะแนนในข้อนี้
//             </p>
//           </div>
//         ) : (
//           <div className="space-y-2">
//             <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-3">
//               ผลคะแนนที่บันทึกไว้
//             </p>
//             {events.map((ev, i) => {
//               const team = teams.find((t) => t.id === ev.team_id);
//               if (!team) return null;
//               const isPos = ev.delta > 0;
//               return (
//                 <motion.div
//                   key={ev.id}
//                   initial={{ x: -8, opacity: 0 }}
//                   animate={{ x: 0, opacity: 1 }}
//                   transition={{ delay: i * 0.05 }}
//                   className="flex items-center justify-between px-4 py-3 rounded border"
//                   style={{
//                     backgroundColor: `${team.color}11`,
//                     borderColor: `${team.color}44`,
//                   }}
//                 >
//                   <div className="flex items-center gap-3">
//                     <div
//                       className="w-2.5 h-2.5 rounded-full"
//                       style={{ backgroundColor: team.color }}
//                     />
//                     <span
//                       className="text-sm font-bold uppercase tracking-wide"
//                       style={{ color: team.color }}
//                     >
//                       {team.name}
//                     </span>
//                   </div>
//                   <span
//                     className={`text-xl font-black tabular-nums ${
//                       isPos ? "text-brand-green" : "text-red-400"
//                     }`}
//                   >
//                     {isPos ? `+${ev.delta}` : ev.delta}
//                     <span className="text-[9px] ml-1 font-normal text-slate-500">PTS</span>
//                   </span>
//                 </motion.div>
//               );
//             })}
//           </div>
//         )}
//       </motion.div>
//     </div>
//   );
// }

// // ── Jeopardy Board ────────────────────────────────────────────────────────────
// function JeopardyBoard({
//   categories,
//   scoreEvents,
//   teams,
// }: {
//   categories: Category[];
//   scoreEvents: ScoreEvent[];
//   teams: RaceData["teams"];
// }) {
//   const [selected, setSelected] = useState<{
//     category: Category;
//     question: Question;
//   } | null>(null);

//   const getEvents = (questionId: number) =>
//     scoreEvents.filter((e) => e.question_id === questionId);

//   const answeredCount = categories.reduce((acc, cat) => {
//     return (
//       acc +
//       (cat.questions?.filter((q) => getEvents(q.id).length > 0).length ?? 0)
//     );
//   }, 0);
//   const totalCount = categories.reduce(
//     (acc, cat) => acc + (cat.questions?.length ?? 0),
//     0
//   );

//   return (
//     <div className="space-y-3">
//       {/* Progress bar */}
//       <div className="flex items-center gap-3">
//         <div className="flex-1 h-1 bg-brand-slate-mid rounded-full overflow-hidden">
//           <div
//             className="h-full bg-brand-cyan/50 transition-all duration-700"
//             style={{ width: totalCount ? `${(answeredCount / totalCount) * 100}%` : "0%" }}
//           />
//         </div>
//         <span className="text-[9px] text-slate-500 tabular-nums">
//           {answeredCount}/{totalCount}
//         </span>
//       </div>

//       {/* Grid */}
//       <div
//         className="grid gap-1"
//         style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }}
//       >
//         {/* Category headers */}
//         {categories.map((cat) => (
//           <div
//             key={cat.id}
//             className="py-2 px-2 text-center bg-brand-cyan/10 border border-brand-cyan/20 rounded-sm"
//           >
//             <span className="text-[9px] font-black uppercase tracking-[0.12em] text-brand-cyan leading-tight block">
//               {cat.name}
//             </span>
//           </div>
//         ))}

//         {/* Question cells — row-by-row (6 rows) */}
//         {Array.from({ length: 6 }, (_, qi) =>
//           categories.map((cat) => {
//             const q = cat.questions?.find((q) => q.number === qi + 1);
//             if (!q) return <div key={`${cat.id}-${qi}`} className="min-h-[64px]" />;
//             return (
//               <JeopardyCell
//                 key={q.id}
//                 question={q}
//                 events={getEvents(q.id)}
//                 teams={teams}
//                 onClick={() => setSelected({ category: cat, question: q })}
//               />
//             );
//           })
//         )}
//       </div>

//       {/* Legend */}
//       <div className="flex items-center gap-5 text-[8px] uppercase tracking-widest text-slate-600 pt-1">
//         <div className="flex items-center gap-1.5">
//           <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan/40" />
//           ยังไม่ตอบ
//         </div>
//         <div className="flex items-center gap-1.5">
//           <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
//           ตอบแล้ว — กดเพื่อดูรายละเอียด
//         </div>
//       </div>

//       {/* Modal */}
//       <AnimatePresence>
//         {selected && (
//           <QuestionModal
//             category={selected.category}
//             question={selected.question}
//             events={getEvents(selected.question.id)}
//             teams={teams}
//             onClose={() => setSelected(null)}
//           />
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// // ── Main ViewerDashboard ──────────────────────────────────────────────────────
// export default function ViewerDashboard() {
//   const [data, setData] = useState<RaceData>({
//     teams: [],
//     positions: [],
//     state: { status: "idle", round: 1 },
//   });
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>([]);
//   const [isRefreshing, setIsRefreshing] = useState(false);

//   const fetchAll = useCallback(async () => {
//     const [fresh, cats, evs] = await Promise.all([
//       loadData(),
//       loadCategories(),
//       loadScoreEvents(),
//     ]);
//     setData(fresh);
//     setCategories(cats);
//     setScoreEvents(evs);
//   }, []);

//   useEffect(() => {
//     fetchAll();
//   }, [fetchAll]);

//   const handleRefresh = async () => {
//     setIsRefreshing(true);
//     await fetchAll();
//     setIsRefreshing(false);
//   };

//   const sortedPositions = [...data.positions].sort((a, b) => b.score - a.score);
//   const topFive = sortedPositions.slice(0, 5);
//   const maxScoreAchieved = Math.max(1, ...data.positions.map((p) => p.score));
//   const visualTarget =
//     data.state.status === "finished"
//       ? maxScoreAchieved
//       : Math.max(10, maxScoreAchieved * 1.1);

//   return (
//     <div className="min-h-screen bg-brand-slate-dark text-slate-100 flex flex-col p-6 font-mono">

//       {/* ── Header ── */}
//       <header className="flex justify-between items-end mb-6 border-b-2 border-brand-slate-border pb-4 shrink-0">
//         <div>
//           <h1 className="text-4xl font-black italic skew-x-[-10deg] neon-text tracking-tighter uppercase">
//             Astro <span className="text-white">Party</span>
//           </h1>
//           <div className="flex gap-4 mt-1">
//             <span className="text-[9px] uppercase tracking-widest text-slate-500">
//               UPLINK:{" "}
//               <span className="text-brand-green border border-brand-green/20 px-1">
//                 ACTIVE
//               </span>
//             </span>
//             <span className="text-[9px] uppercase tracking-widest text-slate-500">
//               FIELD: <span className="text-brand-cyan">DYNAMIC RANGE</span>
//             </span>
//           </div>
//         </div>
//         <div className="flex items-center gap-4">
//           <div className="px-3 py-1 bg-brand-slate-mid border border-brand-slate-border rounded-sm text-[10px] font-bold uppercase tracking-widest text-brand-cyan">
//             ROUND {data.state.round} •{" "}
//             <span className={data.state.status === "finished" ? "text-brand-green" : ""}>
//               {data.state.status.toUpperCase()}
//             </span>
//           </div>
//           <button
//             onClick={handleRefresh}
//             disabled={isRefreshing}
//             className="flex items-center gap-2 px-4 py-2 bg-brand-cyan text-brand-slate-dark font-black uppercase text-xs tracking-widest hover:scale-105 transition-all disabled:opacity-50"
//           >
//             <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
//             Sync
//           </button>
//         </div>
//       </header>

//       {/* ── Track + Sidebar (fixed height) ── */}
//       <div className="flex gap-6 overflow-hidden" style={{ height: "46vh" }}>
//         {/* Track */}
//         <div className="flex-[3] relative border-2 border-brand-slate-border bg-black/40 backdrop-blur-sm overflow-hidden rounded-lg">
//           <div
//             className="absolute inset-0 opacity-10"
//             style={{
//               backgroundImage: `linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)`,
//               backgroundSize: "40px 40px",
//             }}
//           />
//           <div className="absolute bottom-0 left-12 right-24 h-6 border-t border-brand-slate-border flex justify-between px-2">
//             {[0, 0.25, 0.5, 0.75, 1].map((p) => (
//               <div key={p} className="flex flex-col items-center">
//                 <div className="h-2 w-px bg-brand-slate-border" />
//                 <span className="text-[8px] text-slate-500 mt-1">
//                   {Math.floor(p * visualTarget)}
//                 </span>
//               </div>
//             ))}
//           </div>
//           <div className="absolute inset-x-0 bottom-6 top-0 pl-12 pr-24 py-8">
//             <AnimatePresence>
//               {topFive.map((pos, index) => {
//                 const team = data.teams.find((t) => t.id === pos.teamId);
//                 if (!team) return null;
//                 const yPos = (index + 0.5) * (100 / 5);
//                 const isNearRightEdge = pos.score / visualTarget > 0.8;
//                 return (
//                   <motion.div
//                     key={team.id}
//                     layoutId={team.id}
//                     initial={false}
//                     animate={{
//                       left: `${Math.min(100, (pos.score / visualTarget) * 100)}%`,
//                       top: `${yPos}%`,
//                     }}
//                     transition={{ type: "spring", stiffness: 40, damping: 15 }}
//                     className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
//                   >
//                     <div className="group relative flex items-center">
//                       <div
//                         className="w-10 h-7 shrink-0 [clip-path:polygon(0%_0%,100%_50%,0%_100%,25%_50%)] shadow-[0_0_20px_currentColor]"
//                         style={{ backgroundColor: team.color, color: team.color }}
//                       />
//                       <div
//                         className={`absolute flex flex-col gap-1 -translate-y-1/2 top-1/2 group-hover:scale-110 transition-transform ${
//                           isNearRightEdge
//                             ? "right-full mr-3 items-end"
//                             : "left-full ml-3 items-start"
//                         }`}
//                       >
//                         <div
//                           className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-brand-slate-dark/95 border rounded flex items-center gap-2 whitespace-nowrap ${
//                             pos.score >= visualTarget && data.state.status === "finished"
//                               ? "border-brand-green bg-brand-green/20"
//                               : ""
//                           }`}
//                           style={{
//                             borderColor:
//                               pos.score >= visualTarget && data.state.status === "finished"
//                                 ? "#4ade80"
//                                 : `${team.color}66`,
//                             color:
//                               pos.score >= visualTarget && data.state.status === "finished"
//                                 ? "#4ade80"
//                                 : team.color,
//                           }}
//                         >
//                           <span className="opacity-50">#{index + 1}</span> {team.name}
//                           {pos.score >= visualTarget && data.state.status === "finished" && (
//                             <Zap className="w-3 h-2 animate-pulse" />
//                           )}
//                         </div>
//                         <div className="flex items-center gap-1 text-[10px] font-black text-white tabular-nums bg-brand-slate-mid/60 px-1.5 rounded-sm border border-white/5">
//                           <span>{pos.score}</span>
//                           <span className="text-[7px] text-slate-500">P</span>
//                         </div>
//                       </div>
//                     </div>
//                   </motion.div>
//                 );
//               })}
//             </AnimatePresence>
//             {topFive.length === 0 && (
//               <div className="absolute inset-0 flex items-center justify-center text-slate-600 uppercase text-[10px] tracking-widest italic opacity-30">
//                 Awaiting fleet transmission...
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Sidebar Rankings */}
//         <div className="flex-1 min-w-[260px] bg-brand-slate-mid/50 border-2 border-brand-slate-border rounded-lg flex flex-col min-h-0 overflow-hidden">
//           <div className="p-4 border-b border-brand-slate-border bg-brand-slate-mid">
//             <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-cyan flex items-center justify-between">
//               Fleet Rankings
//               <span className="text-[10px] text-slate-500">LIVE</span>
//             </h2>
//           </div>
//           <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
//             {sortedPositions.map((pos, index) => {
//               const team = data.teams.find((t) => t.id === pos.teamId);
//               if (!team) return null;
//               const isTopFive = index < 5;
//               return (
//                 <div
//                   key={team.id}
//                   className={`flex items-center justify-between p-3 border rounded transition-all ${
//                     isTopFive
//                       ? "bg-brand-cyan/5 border-brand-cyan/20"
//                       : "bg-black/20 border-white/5"
//                   }`}
//                 >
//                   <div className="flex items-center gap-3">
//                     <span className={`text-[10px] font-bold w-4 ${index < 3 ? "text-brand-green" : "text-slate-500"}`}>
//                       {index + 1}
//                     </span>
//                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
//                     <span className="text-[11px] font-bold uppercase truncate max-w-[110px]">
//                       {team.name}
//                     </span>
//                   </div>
//                   <div className="text-[10px] font-mono text-slate-400">
//                     {pos.score} <span className="text-[8px]">PTS</span>
//                   </div>
//                 </div>
//               );
//             })}
//             {data.teams.length === 0 && (
//               <div className="p-8 text-center text-[10px] text-slate-600 uppercase italic">No data</div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* ── Jeopardy Board ── */}
//       {categories.length > 0 && (
//         <section className="mt-6 border-2 border-brand-slate-border rounded-lg overflow-hidden">
//           <div className="px-5 py-3 bg-brand-slate-mid border-b border-brand-slate-border flex items-center justify-between">
//             <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-cyan flex items-center gap-2">
//               <Zap className="w-3.5 h-3.5" />
//               Question Board
//             </h2>
//           </div>
//           <div className="p-4 bg-black/20">
//             <JeopardyBoard
//               categories={categories}
//               scoreEvents={scoreEvents}
//               teams={data.teams}
//             />
//           </div>
//         </section>
//       )}

//       {/* ── Footer ── */}
//       <footer className="mt-4 flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-widest shrink-0">
//         <div className="flex gap-6">
//           <span>Total Fleet: {data.teams.length}</span>
//           <span>
//             Lead Pilot:{" "}
//             {data.positions.length > 0
//               ? data.teams.find((t) => t.id === sortedPositions[0]?.teamId)?.name
//               : "NONE"}
//           </span>
//         </div>
//         <div className="flex items-center gap-4">
//           <a
//             href="/admin"
//             className="text-brand-cyan/30 hover:text-brand-cyan transition-colors underline decoration-dotted underline-offset-4"
//           >
//             ADMIN_LINK
//           </a>
//           <div className="flex items-center gap-2">
//             <Zap className="w-3 h-3 text-brand-cyan" />
//             <span>Sync Control: Manual</span>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }
"use client";

/**
 * AstroParty Viewer Dashboard — Slide-Based
 *
 * Merged from:
 *  - File 1: AstropartyJeopardy (slide UI, starfield, animations, navBar)
 *  - File 2: ViewerDashboard (Space Race, JeopardyBoard, FleetRankings, loadData/loadCategories/loadScoreEvents)
 *
 * Slides:
 *  1 — Title
 *  2 — Round Info
 *  3 — Space Race Track + Fleet Rankings
 *  4 — Jeopardy Board
 *  5 — Live Leaderboard
 *  6 — Final Results
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Zap, X } from "lucide-react";
import { RaceData } from "@/app/types";
import { loadData, loadCategories, loadScoreEvents } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Question {
  id: number;
  number: number;
}
interface Category {
  id: number;
  name: string;
  position: number;
  questions: Question[];
}
interface ScoreEvent {
  id: string;
  team_id: string;
  question_id: number;
  delta: number;
}

// ---------------------------------------------------------------------------
// Static
// ---------------------------------------------------------------------------
const TEAM_COLORS = [
  "#22d3ee","#a78bfa","#f472b6","#34d399",
  "#f0b000","#ff6b9d","#fb923c","#60a5fa",
];
const medals = ["🥇","🥈","🥉","🏅","🏅","🏅","🏅","🏅"];

// ---------------------------------------------------------------------------
// Inline styles / helpers
// ---------------------------------------------------------------------------
const glassPanel: React.CSSProperties = {
  background: "rgba(13,27,42,0.7)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(34,211,238,0.2)",
  borderRadius: 16,
};
const neonBorder: React.CSSProperties = {
  border: "1px solid rgba(34,211,238,0.4)",
  boxShadow: "0 0 15px rgba(34,211,238,0.1), inset 0 0 15px rgba(34,211,238,0.05)",
};
const navBtn: React.CSSProperties = {
  background: "rgba(13,27,42,0.8)",
  border: "1px solid rgba(34,211,238,0.3)",
  color: "#f5f0e8",
  padding: "8px 18px",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "'Rajdhani', sans-serif",
  fontWeight: 600,
  fontSize: 15,
  transition: "all 0.2s",
};

// ---------------------------------------------------------------------------
// Starfield
// ---------------------------------------------------------------------------
function Starfield() {
  const stars = Array.from({ length: 120 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 1 + Math.random() * 2,
    dur: 2 + Math.random() * 4,
    delay: Math.random() * 3,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            ["--dur" as any]: `${s.dur}s`,
            ["--delay" as any]: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// JeopardyCell
// ---------------------------------------------------------------------------
function JeopardyCell({
  question,
  events,
  teams,
  onClick,
}: {
  question: Question;
  events: ScoreEvent[];
  teams: RaceData["teams"];
  onClick: () => void;
}) {
  const answered = events.length > 0;
  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        minHeight: 60,
        padding: "8px 6px",
        borderRadius: 8,
        border: answered
          ? "1px solid rgba(107,33,168,0.2)"
          : "1px solid rgba(34,211,238,0.3)",
        background: answered
          ? "rgba(10,10,26,0.8)"
          : "linear-gradient(135deg, rgba(13,27,42,0.9), rgba(107,33,168,0.3))",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        transition: "all 0.2s",
        opacity: answered ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = answered
          ? "none"
          : "0 0 20px rgba(34,211,238,0.4)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {answered ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
          {events.map((ev) => {
            const team = teams.find((t) => t.id === ev.team_id);
            if (!team) return null;
            return (
              <div
                key={ev.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: `${team.color}20`,
                  borderLeft: `2px solid ${team.color}`,
                  fontSize: 9,
                  fontWeight: 700,
                  color: ev.delta > 0 ? team.color : "#f87171",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 60 }}>
                  {team.name}
                </span>
                <span>{ev.delta > 0 ? `+${ev.delta}` : ev.delta}</span>
              </div>
            );
          })}
          <div style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: "50%", background: "rgba(107,33,168,0.5)" }} />
        </div>
      ) : (
        <span
          style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 11,
            fontWeight: 700,
            color: "#22d3ee",
          }}
        >
          ข้อ {question.number}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestionModal
// ---------------------------------------------------------------------------
function QuestionModal({
  category,
  question,
  events,
  teams,
  onClose,
}: {
  category: Category;
  question: Question;
  events: ScoreEvent[];
  teams: RaceData["teams"];
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 12 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        style={{
          ...glassPanel,
          ...neonBorder,
          position: "relative",
          padding: 40,
          width: 440,
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            color: "rgba(245,240,232,0.5)",
            cursor: "pointer",
          }}
        >
          <X size={16} />
        </button>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "'Orbitron', monospace", color: "#22d3ee", fontSize: 11, letterSpacing: "0.2em", marginBottom: 6 }}>
            {category.name}
          </p>
          <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: 26, fontWeight: 900, color: "#f5f0e8", margin: 0 }}>
            ข้อ {question.number}
          </h3>
        </div>
        {events.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", borderRadius: 8, border: "1px dashed rgba(34,211,238,0.2)" }}>
            <p style={{ fontSize: 11, color: "rgba(245,240,232,0.3)", letterSpacing: "0.2em" }}>
              ยังไม่มีการให้คะแนนในข้อนี้
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(245,240,232,0.4)", marginBottom: 4 }}>
              ผลคะแนนที่บันทึกไว้
            </p>
            {events.map((ev, i) => {
              const team = teams.find((t) => t.id === ev.team_id);
              if (!team) return null;
              const isPos = ev.delta > 0;
              return (
                <motion.div
                  key={ev.id}
                  initial={{ x: -8, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: `${team.color}11`,
                    border: `1px solid ${team.color}44`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: team.color }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: team.color }}>{team.name}</span>
                  </div>
                  <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 20, fontWeight: 900, color: isPos ? "#34d399" : "#f87171" }}>
                    {isPos ? `+${ev.delta}` : ev.delta}
                    <span style={{ fontSize: 9, color: "rgba(245,240,232,0.4)", marginLeft: 4 }}>PTS</span>
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ViewerDashboard() {
  const totalSlides = 6;
  const [currentSlide, setCurrentSlide] = useState(1);

  // Data state
  const [data, setData] = useState<RaceData>({
    teams: [],
    positions: [],
    state: { status: "idle", round: 1 },
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  // Board modal
  const [selectedCell, setSelectedCell] = useState<{
    category: Category;
    question: Question;
  } | null>(null);

  const fetchAll = useCallback(async () => {
    const [fresh, cats, evs] = await Promise.all([
      loadData(),
      loadCategories(),
      loadScoreEvents(),
    ]);
    setData(fresh);
    setCategories(cats);
    setScoreEvents(evs);
    setDataReady(true);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAll();
    setIsRefreshing(false);
  };

  // Navigation
  const goToSlide = useCallback((n: number) => setCurrentSlide(n), []);
  const nextSlide = () => setCurrentSlide((s) => Math.min(s + 1, totalSlides));
  const prevSlide = () => setCurrentSlide((s) => Math.max(s - 1, 1));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "Escape") setSelectedCell(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Confetti
  const launchConfetti = () => {
    const c = document.getElementById("confetti-root");
    if (!c) return;
    c.innerHTML = "";
    const colors = ["#22d3ee","#a78bfa","#f472b6","#34d399","#e8d5b7"];
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement("div");
      const color = colors[Math.floor(Math.random() * colors.length)];
      piece.style.cssText = `position:absolute;left:${Math.random()*100}%;top:-20px;width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;background:${color};border-radius:${Math.random()>0.5?"50%":"2px"};animation:confettiFall ${2+Math.random()*3}s linear ${Math.random()*2}s forwards;`;
      c.appendChild(piece);
    }
  };

  // Derived
  const sortedPositions = [...data.positions].sort((a, b) => b.score - a.score);
  const topFive = sortedPositions.slice(0, 5);
  const maxScoreAchieved = Math.max(1, ...data.positions.map((p) => p.score));
  const visualTarget =
    data.state.status === "finished"
      ? maxScoreAchieved
      : Math.max(10, maxScoreAchieved * 1.1);

  const getEvents = (questionId: number) =>
    scoreEvents.filter((e) => e.question_id === questionId);

  const answeredCount = categories.reduce(
    (acc, cat) => acc + (cat.questions?.filter((q) => getEvents(q.id).length > 0).length ?? 0),
    0
  );
  const totalQCount = categories.reduce(
    (acc, cat) => acc + (cat.questions?.length ?? 0),
    0
  );

  // Refresh button (shared)
  const RefreshBtn = () => (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      style={{
        ...navBtn,
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: isRefreshing ? "rgba(34,211,238,0.1)" : "rgba(34,211,238,0.2)",
        opacity: isRefreshing ? 0.7 : 1,
      }}
    >
      <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
      Sync
    </button>
  );

  // ---- Slide 1: Title -------------------------------------------------------
  const Slide1 = () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", position: "relative", padding: 32 }}>
      <div style={{ position: "absolute", top: 40, right: 64, width: 96, height: 96, borderRadius: "50%", background: "radial-gradient(circle at 30% 30%, #e8d5b7, #8b7355)", opacity: 0.6, animation: "float 6s ease-in-out infinite", boxShadow: "0 0 40px rgba(232,213,183,0.3)" }} />
      <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(2.5rem,6vw,5rem)", fontWeight: 900, textAlign: "center", color: "#22d3ee", letterSpacing: 4, animation: "glowPulse 3s ease-in-out infinite", margin: 0 }}>
        ASTROPARTY
      </h1>
      <div style={{ width: 192, height: 4, borderRadius: 4, background: "linear-gradient(90deg, transparent, #22d3ee, transparent)", margin: "16px 0", animation: "glowPulse 2s infinite" }} />
      <p style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(1rem,2vw,1.25rem)", fontWeight: 700, letterSpacing: "0.3em", color: "#a78bfa", margin: "0 0 8px 0" }}>
        VIEWER DASHBOARD
      </p>
      <p style={{ fontSize: "clamp(0.9rem,2vw,1.1rem)", fontWeight: 300, letterSpacing: "0.2em", opacity: 0.7, color: "#e8d5b7", margin: 0 }}>
        Live Competition Tracker
      </p>

      {/* Status badges */}
      <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
        <div style={{ ...glassPanel, padding: "8px 20px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: dataReady ? "#34d399" : "#f472b6", animation: "glowPulse 1.5s infinite" }} />
          <span style={{ fontSize: 12, letterSpacing: "0.15em", color: dataReady ? "#34d399" : "#f472b6" }}>
            {dataReady ? "DATA LINKED" : "CONNECTING…"}
          </span>
        </div>
        <div style={{ ...glassPanel, padding: "8px 20px" }}>
          <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 12, color: "#22d3ee", letterSpacing: "0.15em" }}>
            ROUND {data.state.round}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <div style={{ ...glassPanel, ...neonBorder, padding: "12px 28px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, letterSpacing: "0.15em", opacity: 0.6 }}>Press → to begin</span>
          <RefreshBtn />
        </div>
      </div>
    </div>
  );

  // ---- Slide 2: Round Info -------------------------------------------------
  const Slide2 = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: 32 }}>
      <div style={{ ...glassPanel, ...neonBorder, padding: 48, maxWidth: 760, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, color: "#22d3ee", animation: "glowPulse 3s infinite", margin: 0 }}>
            Round {data.state.round}
          </h2>
          <div style={{ padding: "6px 16px", borderRadius: 6, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)" }}>
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 12, fontWeight: 700, color: data.state.status === "finished" ? "#34d399" : "#22d3ee", letterSpacing: "0.15em" }}>
              {data.state.status.toUpperCase()}
            </span>
          </div>
        </div>
        <p style={{ textAlign: "left", fontSize: 18, color: "#e8d5b7", opacity: 0.6, marginBottom: 32 }}>
          Medical Science Competition
        </p>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
          {[
            ["👥 Teams", data.teams.length],
            ["✅ Answered", `${answeredCount} / ${totalQCount}`],
            ["🏆 Leader", sortedPositions[0] ? (data.teams.find((t) => t.id === sortedPositions[0].teamId)?.name ?? "—") : "—"],
          ].map(([label, val]) => (
            <div key={String(label)} style={{ ...glassPanel, padding: "12px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, color: "#22d3ee" }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <>
            <h3 style={{ color: "#22d3ee", fontWeight: 700, margin: "0 0 10px" }}>Categories:</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {categories.map((c) => (
                <div key={c.id} style={{ ...glassPanel, padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#e8d5b7" }}>
                  {c.name}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ---- Slide 3: Space Race + Fleet Rankings --------------------------------
  const Slide3 = () => (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: 24, gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(1.25rem,2.5vw,2rem)", fontWeight: 900, color: "#22d3ee", animation: "glowPulse 3s infinite", margin: 0 }}>
          SPACE RACE
        </h2>
        <RefreshBtn />
      </div>

      {/* Track + Sidebar */}
      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Track */}
        <div
          style={{
            flex: 3,
            position: "relative",
            ...glassPanel,
            overflow: "hidden",
            borderRadius: 12,
          }}
        >
          {/* Grid background */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.08,
            backgroundImage: "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />

          {/* Scale marks */}
          <div style={{ position: "absolute", bottom: 0, left: 48, right: 80, height: 24, borderTop: "1px solid rgba(34,211,238,0.15)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0 8px" }}>
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <div key={p} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 1, height: 8, background: "rgba(34,211,238,0.2)" }} />
                <span style={{ fontSize: 9, color: "rgba(245,240,232,0.3)", marginTop: 2 }}>
                  {Math.floor(p * visualTarget)}
                </span>
              </div>
            ))}
          </div>

          {/* Ships */}
          <div style={{ position: "absolute", left: 48, right: 80, top: 0, bottom: 24, padding: "16px 0" }}>
            <AnimatePresence>
              {topFive.map((pos, index) => {
                const team = data.teams.find((t) => t.id === pos.teamId);
                if (!team) return null;
                const yPos = (index + 0.5) * (100 / 5);
                const isNearRight = pos.score / visualTarget > 0.8;
                return (
                  <motion.div
                    key={team.id}
                    layoutId={`ship-${team.id}`}
                    initial={false}
                    animate={{
                      left: `${Math.min(100, (pos.score / visualTarget) * 100)}%`,
                      top: `${yPos}%`,
                    }}
                    transition={{ type: "spring", stiffness: 40, damping: 15 }}
                    style={{ position: "absolute", transform: "translate(-50%, -50%)", zIndex: 10 }}
                  >
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      {/* Ship body */}
                      <div
                        style={{
                          width: 40, height: 28, flexShrink: 0,
                          clipPath: "polygon(0% 0%, 100% 50%, 0% 100%, 25% 50%)",
                          backgroundColor: team.color,
                          boxShadow: `0 0 20px ${team.color}`,
                        }}
                      />
                      {/* Label */}
                      <div style={{
                        position: "absolute",
                        top: "50%",
                        transform: "translateY(-50%)",
                        ...(isNearRight ? { right: "calc(100% + 10px)" } : { left: "calc(100% + 10px)" }),
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                        alignItems: isNearRight ? "flex-end" : "flex-start",
                        whiteSpace: "nowrap",
                      }}>
                        <div style={{
                          fontFamily: "'Orbitron', monospace",
                          fontSize: 9, fontWeight: 900,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: "rgba(10,10,26,0.95)",
                          border: `1px solid ${team.color}66`,
                          color: team.color,
                          letterSpacing: "0.12em",
                        }}>
                          <span style={{ opacity: 0.5 }}>#{index + 1}</span> {team.name}
                        </div>
                        <div style={{
                          fontFamily: "'Orbitron', monospace",
                          fontSize: 10, fontWeight: 900,
                          padding: "1px 6px",
                          borderRadius: 3,
                          background: "rgba(13,27,42,0.6)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          color: "#f5f0e8",
                        }}>
                          {pos.score} <span style={{ fontSize: 7, color: "rgba(245,240,232,0.4)" }}>P</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {topFive.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(245,240,232,0.2)", fontSize: 11, letterSpacing: "0.2em" }}>
                AWAITING FLEET TRANSMISSION…
              </div>
            )}
          </div>

          {/* Finish line */}
          <div style={{ position: "absolute", right: 80, top: 0, bottom: 24, width: 1, background: "rgba(34,211,238,0.25)" }} />
        </div>

        {/* Fleet Rankings sidebar */}
        <div style={{ flex: 1, minWidth: 220, ...glassPanel, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(34,211,238,0.15)" }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 10, fontWeight: 900, color: "#22d3ee", letterSpacing: "0.2em", display: "flex", justifyContent: "space-between" }}>
              Fleet Rankings
              <span style={{ opacity: 0.4 }}>LIVE</span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {sortedPositions.map((pos, index) => {
              const team = data.teams.find((t) => t.id === pos.teamId);
              if (!team) return null;
              const isTop = index < 5;
              return (
                <div
                  key={team.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 12px", borderRadius: 8,
                    background: isTop ? "rgba(34,211,238,0.05)" : "rgba(0,0,0,0.2)",
                    border: isTop ? "1px solid rgba(34,211,238,0.2)" : "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, width: 14, color: index < 3 ? "#34d399" : "rgba(245,240,232,0.4)" }}>
                      {index + 1}
                    </span>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: team.color }} />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {team.name}
                    </span>
                  </div>
                  <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 10, color: "rgba(245,240,232,0.5)" }}>
                    {pos.score} <span style={{ fontSize: 8 }}>PTS</span>
                  </span>
                </div>
              );
            })}
            {data.teams.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", fontSize: 10, color: "rgba(245,240,232,0.2)", letterSpacing: "0.15em" }}>
                NO DATA
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Finish line label */}
      <div style={{ textAlign: "right", paddingRight: 92, fontSize: 11, opacity: 0.35, letterSpacing: "0.1em", flexShrink: 0 }}>
        🏁 FINISH LINE ({Math.floor(visualTarget)} PTS) →
      </div>
    </div>
  );

  // ---- Slide 4: Jeopardy Board ---------------------------------------------
  const Slide4 = () => (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: 24, overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
        <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(1.25rem,2.5vw,2rem)", fontWeight: 900, color: "#22d3ee", animation: "glowPulse 3s infinite", margin: 0 }}>
          QUESTION BOARD
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 8, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)" }}>
            <Zap size={12} color="#22d3ee" />
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: "#22d3ee" }}>
              {answeredCount}/{totalQCount}
            </span>
          </div>
          <RefreshBtn />
        </div>
      </div>

      {categories.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ opacity: 0.3, letterSpacing: "0.15em", fontSize: 12 }}>No categories loaded — press Sync</p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexShrink: 0 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(34,211,238,0.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "rgba(34,211,238,0.5)", width: totalQCount ? `${(answeredCount / totalQCount) * 100}%` : "0%", transition: "width 0.7s ease" }} />
            </div>
            <span style={{ fontSize: 10, color: "rgba(245,240,232,0.4)", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
              {answeredCount} / {totalQCount}
            </span>
          </div>

          {/* Board grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${categories.length}, 1fr)`,
              gap: 6,
            }}
          >
            {/* Category headers */}
            {categories.map((cat) => (
              <div
                key={cat.id}
                style={{
                  padding: "8px 6px", textAlign: "center",
                  background: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.2)",
                  borderRadius: 6,
                }}
              >
                <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 10, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.1em", lineHeight: 1.3, display: "block" }}>
                  {cat.name}
                </span>
              </div>
            ))}

            {/* Question cells — row by row */}
            {Array.from({ length: 6 }, (_, qi) =>
              categories.map((cat) => {
                const q = cat.questions?.find((q) => q.number === qi + 1);
                if (!q) return <div key={`${cat.id}-${qi}`} style={{ minHeight: 60 }} />;
                return (
                  <JeopardyCell
                    key={q.id}
                    question={q}
                    events={getEvents(q.id)}
                    teams={data.teams}
                    onClick={() => setSelectedCell({ category: cat, question: q })}
                  />
                );
              })
            )}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 20, paddingTop: 12, flexShrink: 0 }}>
            {[
              ["rgba(34,211,238,0.4)", "ยังไม่ตอบ"],
              ["rgba(107,33,168,0.5)", "ตอบแล้ว — กดเพื่อดูรายละเอียด"],
            ].map(([color, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "rgba(245,240,232,0.4)", letterSpacing: "0.1em" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                {label}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Question detail modal */}
      <AnimatePresence>
        {selectedCell && (
          <QuestionModal
            category={selectedCell.category}
            question={selectedCell.question}
            events={getEvents(selectedCell.question.id)}
            teams={data.teams}
            onClose={() => setSelectedCell(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );

  // ---- Slide 5: Live Leaderboard -------------------------------------------
  const Slide5 = () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(1.5rem,3vw,2.5rem)", fontWeight: 900, color: "#22d3ee", animation: "glowPulse 3s infinite", margin: 0 }}>
          LIVE LEADERBOARD
        </h2>
        <RefreshBtn />
      </div>
      <div style={{ width: "100%", maxWidth: 720 }}>
        {sortedPositions.length === 0 && (
          <p style={{ opacity: 0.4, textAlign: "center", letterSpacing: "0.15em" }}>No teams yet</p>
        )}
        {sortedPositions.map((pos, i) => {
          const team = data.teams.find((t) => t.id === pos.teamId);
          if (!team) return null;
          return (
            <div
              key={team.id}
              style={{
                ...glassPanel, ...neonBorder,
                borderLeft: `4px solid ${team.color}`,
                padding: 16, marginBottom: 12,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 30 }}>{medals[i]}</span>
                <span style={{ fontSize: 20, fontWeight: 700 }}>{team.name}</span>
              </div>
              <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 26, fontWeight: 900, color: team.color }}>
                {pos.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ---- Slide 6: Final Results ----------------------------------------------
  const Slide6 = () => {
    useEffect(() => { launchConfetti(); }, []);
    const winner = sortedPositions[0] ? data.teams.find((t) => t.id === sortedPositions[0].teamId) : null;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: 32, position: "relative" }}>
        <div id="confetti-root" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }} />
        <div style={{ fontSize: 64, animation: "float 2s ease-in-out infinite", marginBottom: 16 }}>🚀</div>
        <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 900, color: "#22d3ee", animation: "glowPulse 3s infinite", marginBottom: 8 }}>
          CONGRATULATIONS!
        </h2>
        {winner && (
          <p style={{ fontSize: 26, fontWeight: 700, color: winner.color, marginBottom: 32 }}>
            {winner.name}
          </p>
        )}
        <div style={{ width: "100%", maxWidth: 600 }}>
          {sortedPositions.map((pos, i) => {
            const team = data.teams.find((t) => t.id === pos.teamId);
            if (!team) return null;
            return (
              <div key={team.id} style={{ ...glassPanel, ...neonBorder, padding: "14px 20px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{medals[i]}</span>
                  <span style={{ fontSize: 17, fontWeight: 700, color: team.color }}>{team.name}</span>
                </div>
                <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 20, fontWeight: 900 }}>{pos.score}</span>
              </div>
            );
          })}
        </div>
        <button style={{ ...navBtn, marginTop: 24, background: "rgba(34,211,238,0.15)" }} onClick={() => goToSlide(1)}>
          ↩ Back to Start
        </button>
      </div>
    );
  };

  // ---- Nav bar -------------------------------------------------------------
  const NavBar = () => (
    <div
      style={{
        position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
        zIndex: 50, display: "flex", alignItems: "center", gap: 10,
      }}
    >
      <button style={navBtn} onClick={prevSlide}>← Prev</button>
      <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, opacity: 0.5, color: "#f5f0e8" }}>
        {currentSlide} / {totalSlides}
      </span>
      <button style={navBtn} onClick={nextSlide}>Next →</button>
      {/* Quick nav */}
      {[
        ["🚀", 3, "Race"],
        ["📋", 4, "Board"],
        ["📊", 5, "Scores"],
        ["🏆", 6, "Finals"],
      ].map(([icon, n, label]) => (
        <button
          key={String(n)}
          style={{ ...navBtn, padding: "6px 12px", fontSize: 12, opacity: currentSlide === n ? 1 : 0.5 }}
          onClick={() => goToSlide(n as number)}
          title={String(label)}
        >
          {icon}
        </button>
      ))}
    </div>
  );

  // ---- Slide map -----------------------------------------------------------
  const slides: Record<number, React.ReactNode> = {
    1: <Slide1 />,
    2: <Slide2 />,
    3: <Slide3 />,
    4: <Slide4 />,
    5: <Slide5 />,
    6: <Slide6 />,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes twinkle { 0%,100%{opacity:.3} 50%{opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes glowPulse {
          0%,100%{text-shadow:0 0 20px rgba(34,211,238,.5),0 0 40px rgba(107,33,168,.3)}
          50%{text-shadow:0 0 40px rgba(34,211,238,.8),0 0 80px rgba(107,33,168,.6),0 0 120px rgba(34,211,238,.3)}
        }
        @keyframes confettiFall {
          0%{transform:translateY(-100%) rotate(0deg);opacity:1}
          100%{transform:translateY(500%) rotate(720deg);opacity:0}
        }
        .star { position:absolute; background:white; border-radius:50%; animation:twinkle var(--dur) ease-in-out infinite; animation-delay:var(--delay); }
      `}</style>

      <div style={{ position: "fixed", inset: 0, background: "#0a0a1a", fontFamily: "'Rajdhani', sans-serif", color: "#f5f0e8", overflow: "hidden" }}>
        <Starfield />
        <div style={{ position: "absolute", inset: 0, display: "flex", zIndex: 10 }}>
          {slides[currentSlide]}
        </div>
        <NavBar />
      </div>
    </>
  );
}