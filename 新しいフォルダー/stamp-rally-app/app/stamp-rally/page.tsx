"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Script from "next/script";

const totalStamps = 22;
const venues = [
	{ name: "大田区総合体育館", lat: 35.565, lon: 139.715 },
	{ name: "筑波大学", lat: 36.11, lon: 140.1 },
	{ name: "日本体育大学世田谷キャンパス", lat: 35.635, lon: 139.63 },
	{ name: "明治大学和泉キャンパス", lat: 35.67, lon: 139.66 },
	{ name: "駒沢オリンピック公園総合運動場屋内球技場", lat: 35.625, lon: 139.66 },
	{ name: "白鷗大学大行寺キャンパス", lat: 36.33, lon: 139.81 },
	{ name: "白鷗大学本キャンパス", lat: 36.34, lon: 139.8 },
	{ name: "国立代々木競技場第二体育館", lat: 35.669, lon: 139.69 },
	{ name: "専修大学生田キャンパス", lat: 35.61, lon: 139.54 },
	{ name: "立川立飛アリーナ", lat: 35.71, lon: 139.42 },
	{ name: "東海大学湘南キャンパス", lat: 35.36, lon: 139.31 },
	{ name: "大東文化大学東松山キャンパス", lat: 36.0, lon: 139.35 },
	{ name: "青山学院大学相模原キャンパス", lat: 35.56, lon: 139.39 },
];
const maxDistance = 1000;

const specialStampNumbers = [3, 7, 12, 22];
const adminPassword = "3557";

const stampDateRestrictions: { [key: number]: { end: string } } = {
	1: { end: "2025-08-27" },
	2: { end: "2025-08-30" },
	3: { end: "2025-08-31" },
	4: { end: "2025-09-03" },
	5: { end: "2025-09-06" },
	6: { end: "2025-09-07" },
	7: { end: "2025-09-10" },
	8: { end: "2025-09-13" },
	9: { end: "2025-09-14" },
	10: { end: "2025-09-27" },
	11: { end: "2025-09-28" },
	12: { end: "2025-10-04" },
	13: { end: "2025-10-05" },
	14: { end: "2025-10-11" },
	15: { end: "2025-10-12" },
	16: { end: "2025-10-13" },
	17: { end: "2025-10-18" },
	18: { end: "2025-10-19" },
	19: { end: "2025-10-25" },
	20: { end: "2025-10-26" },
	21: { end: "2025-11-01" },
	22: { end: "2025-11-02" },
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
	const R = 6371e3;
	const phi1 = (lat1 * Math.PI) / 180;
	const phi2 = (lat2 * Math.PI) / 180;
	const dphi = ((lat2 - lat1) * Math.PI) / 180;
	const dl = ((lon2 - lon1) * Math.PI) / 180;
	const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dl / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
};

declare global {
	interface Window {
		liff: any;
	}
}
const liffId = "2007663892-mQOQRy2z";

type StampHistory = { stampNumber: number; venueName: string; date: string; source: string };

const stampQRCodes: { [key: string]: number } = {};
for (let i = 1; i <= totalStamps; i++) {
	stampQRCodes[`KCBF_STAMP_${String(i).padStart(3, "0")}`] = i;
}

export default function StampRallyPage() {
	const [stampedNumbers, setStampedNumbers] = useState<number[]>([]);
	const [history, setHistory] = useState<StampHistory[]>([]);
	const [outputMessage, setOutputMessage] = useState("");
	const [staffPrize, setStaffPrize] = useState("");
	const [showStaffConfirm, setShowStaffConfirm] = useState(false);
	const [adminOpen, setAdminOpen] = useState(false);

	const [liffLoading, setLiffLoading] = useState(true);
	const [liffError, setLiffError] = useState("");
	const [profile, setProfile] = useState<any>(null);
	const [liffReady, setLiffReady] = useState(false);

	useEffect(() => {
		if (!liffReady) return;
		async function initLiff() {
			if (!window.liff) {
				setLiffError("LIFF SDKが読み込まれていません。LINEアプリで開いてください。");
				setLiffLoading(false);
				return;
			}
			try {
				await window.liff.init({ liffId });
				if (!window.liff.isLoggedIn()) {
					const params = new URLSearchParams(window.location.search);
					const stamp = params.get("stamp");
					if (stamp) {
						window.liff.login({
							redirectUri: window.location.origin + window.location.pathname + "?stamp=" + encodeURIComponent(stamp),
						});
					} else {
						window.liff.login();
					}
					return;
				}
				const prof = await window.liff.getProfile();
				setProfile(prof);
				setLiffLoading(false);
			} catch (e: any) {
				setLiffError("LINEログイン必須です。再読込してください。");
				setLiffLoading(false);
				console.error(e);
			}
		}
		initLiff();
	}, [liffReady]);

	useEffect(() => {
		const stamped = JSON.parse(localStorage.getItem("stamps_v1") || "[]");
		const his = JSON.parse(localStorage.getItem("stamp_history_v1") || "[]");
		setStampedNumbers(stamped);
		setHistory(his);
	}, []);

	useEffect(() => {
		localStorage.setItem("stamps_v1", JSON.stringify(stampedNumbers));
		localStorage.setItem("stamp_history_v1", JSON.stringify(history));
	}, [stampedNumbers, history]);

	useEffect(() => {
		if (!profile) return;
		const params = new URLSearchParams(window.location.search);
		const stampParam = params.get("stamp");
		if (stampParam) {
			handleQRCode(stampParam, profile);
			params.delete("stamp");
			window.history.replaceState({}, "", window.location.pathname + (params.toString() ? "?" + params.toString() : ""));
		}
	}, [profile]);

	async function handleQRCode(qrValue: string, prof: any) {
		const stampNumber = stampQRCodes[qrValue];
		if (!stampNumber || stampNumber < 1 || stampNumber > totalStamps) {
			setOutputMessage("無効なQRコードです");
			return;
		}
		const restriction = stampDateRestrictions[stampNumber];
		if (restriction) {
			const now = new Date();
			const todayStr = now.toISOString().slice(0, 10);
			if (todayStr > restriction.end) {
				setOutputMessage("日付が過ぎています");
				return;
			}
		}
		setOutputMessage("位置情報を取得中...");
		try {
			const pos = await getCurrentPosition();
			const { latitude, longitude } = pos.coords;
			let closestVenue: { name: string; lat: number; lon: number } | null = null;
			let minDistance = Infinity;
			for (const venue of venues) {
				const d = getDistance(latitude, longitude, venue.lat, venue.lon);
				if (d < minDistance) {
					minDistance = d;
					closestVenue = venue;
				}
			}
			if (!closestVenue || minDistance > maxDistance) {
				setOutputMessage(`会場の近くにいません（最寄り: ${closestVenue?.name}まで約${Math.round(minDistance)}m）`);
				return;
			}
			const nextStamp = stampedNumbers.length + 1;
			if (nextStamp > totalStamps) {
				setOutputMessage("全て獲得済みです！");
				return;
			}
			const nowStr = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
			setStampedNumbers([...stampedNumbers, nextStamp]);
			setHistory([
				...history,
				{ stampNumber: nextStamp, venueName: closestVenue.name, date: nowStr, source: `QR / ${prof.displayName || "ゲスト"}` },
			]);
			setOutputMessage(`スタンプ${nextStamp}を獲得！（会場: ${closestVenue.name}）`);
			if (specialStampNumbers.includes(nextStamp)) {
				setStaffPrize(`${nextStamp === 22 ? "❓" : "🎁"} ギフト（${nextStamp}個目）`);
				setShowStaffConfirm(true);
			}
		} catch (e: any) {
			setOutputMessage(e.message || "位置情報取得エラー");
		}
	}

	function getCurrentPosition(): Promise<GeolocationPosition> {
		return new Promise((resolve, reject) => {
			if (!navigator.geolocation) {
				reject(new Error("この端末は位置情報取得に非対応です"));
			} else {
				navigator.geolocation.getCurrentPosition(
					resolve,
					err => {
						if (err.code === 1) reject(new Error("位置情報の利用が許可されていません。設定で許可してください。"));
						else if (err.code === 2) reject(new Error("現在、位置情報を取得できません。"));
						else if (err.code === 3) reject(new Error("位置情報の取得がタイムアウトしました"));
						else reject(new Error("位置情報取得に失敗しました"));
					},
					{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
				);
			}
		});
	}

	function handleAdminAdd() {
		const pw = prompt("パスワードを入力");
		if (pw !== adminPassword) {
			alert("パスワードが違います");
			return;
		}
		if (stampedNumbers.length >= totalStamps) {
			alert("全てのスタンプ獲得済みです");
			return;
		}
		const nextStamp = stampedNumbers.length + 1;
		setStampedNumbers([...stampedNumbers, nextStamp]);
		setHistory([
			...history,
			{ stampNumber: nextStamp, venueName: "管理者追加", date: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }), source: "admin" },
		]);
		setOutputMessage(`スタンプ${nextStamp}を追加しました`);
	}

	function handleAdminDelete() {
		const pw = prompt("パスワードを入力");
		if (pw !== adminPassword) {
			alert("パスワードが違います");
			return;
		}
		if (stampedNumbers.length === 0) {
			alert("削除できるスタンプがありません");
			return;
		}
		const last = stampedNumbers[stampedNumbers.length - 1];
		setStampedNumbers(prev => prev.slice(0, -1));
		setHistory(prev => prev.slice(0, -1));
		setOutputMessage(`スタンプ${last}を削除しました`);
	}

	const nextPrizeNumber = specialStampNumbers.find(num => stampedNumbers.length < num);

	if (liffError) {
		return (
			<div style={{ color: "red", fontWeight: "bold", textAlign: "center", marginTop: "40px" }}>{liffError}</div>
		);
	}
	if (liffLoading || !profile) {
		return (
			<div style={{ textAlign: "center", marginTop: "40px" }}>
				<Image src="/autumn_logo.png" alt="logo" width={100} height={100} />
				<h2>LINE認証中...</h2>
				<Script src="https://static.line-scdn.net/liff/edge/2/sdk.js" strategy="afterInteractive" onLoad={() => setLiffReady(true)} />
			</div>
		);
	}

	return (
		<>
			<Script src="https://static.line-scdn.net/liff/edge/2/sdk.js" strategy="afterInteractive" onLoad={() => setLiffReady(true)} />
			<header>
				<Image src="/autumn_logo.png" className="logo" alt="AUTUMN LEAGUE LOGO" width={110} height={110} />
				<div className="main-title">AUTUMN LEAGUE</div>
				<div className="subtitle">スタンプラリー</div>
			</header>
			<div className="line-status">
				<div className="line-info">
					<strong>
						こんにちは、<span>{profile.displayName}</span> さん
					</strong>
				</div>
				<div>LINE接続状況: ✅ 接続済み</div>
				<div className="user-info" style={{ display: "block" }}>
					<strong>ユーザー情報:</strong>
					<br />
					名前: {profile.displayName}
					<br />
					ID: {profile.userId.substring(0, 8)}...
				</div>
			</div>
			<div className="progress-summary">
				<p className="stamp-count">
					現在のスタンプ: <span className="count-large">{stampedNumbers.length}</span> / {totalStamps}
				</p>
				{nextPrizeNumber && (
					<p className="next-prize-info">
						次のギフトまであと <span className="count-large">{nextPrizeNumber - stampedNumbers.length}</span> 個
					</p>
				)}
			</div>
			<div className="prize-progress-bar">
				{specialStampNumbers.map(num => (
					<div key={num} className={`prize-progress ${stampedNumbers.length >= num ? "prize-done" : ""}`}>
						<span className="prize-num">{num}</span>
						<span className="prize-label">{stampedNumbers.length >= num ? "🎁獲得済" : "🎁GET!"}</span>
					</div>
				))}
			</div>
			<div className="stamp-container">
				{Array.from({ length: totalStamps }, (_, i) => i + 1).map(num => (
					<div key={num} className={`stamp ${stampedNumbers.includes(num) ? "stamped" : ""} ${specialStampNumbers.includes(num) ? "special-stamp" : ""}`}>
						{num === 3 || num === 7 || num === 12 ? (
							<>
								{num}
								<span className="special-label">🎁
									<br />
									ギフト
								</span>
							</>
						) : num === 22 ? (
							<>
								{num}
								<span className="special-label">❓
									<br />
									ギフト
								</span>
							</>
						) : (
							num
						)}
					</div>
				))}
			</div>
			<div style={{ margin: "24px 0", textAlign: "center", minHeight: "40px" }}>
				<p id="outputMessage" style={{ fontWeight: "bold" }}>
					{outputMessage}
				</p>
			</div>
			{showStaffConfirm && (
				<div className="staff-confirm-container">
					<div className="confirm-label">
						<span>🎉 おめでとうございます！</span>
						<br />
						<span>{staffPrize} を獲得しました。</span>
						<br />
						<span style={{ color: "#c30000" }}>会場スタッフにこの画面をお見せください。</span>
					</div>
					<button onClick={() => setShowStaffConfirm(false)}>スタッフが景品を渡したらタップ</button>
				</div>
			)}
			<div className="history-list">
				<div className="history-title">獲得履歴</div>
				{history.length === 0 ? (
					<div>まだスタンプは獲得されていません</div>
				) : (
					history.map((h, i) => (
						<div key={i} className="history-item">
							スタンプ{h.stampNumber}：{h.venueName}（{h.date}） [{h.source}]
						</div>
					))
				)}
			</div>
			<div className="admin-controls-wrapper">
				<button className="button admin-toggle-btn" onClick={() => setAdminOpen(!adminOpen)}>
					{adminOpen ? "管理者ツールを閉じる" : "管理者用ツール"}
				</button>
				{adminOpen && (
					<div className="admin-controls">
						<h3 style={{ width: "100%", textAlign: "center", color: "#495057", marginTop: 0, fontSize: "1em", marginBottom: "10px" }}>
							管理者用ツール
						</h3>
						<button className="button admin-btn" onClick={handleAdminAdd}>
							スタンプ追加
						</button>
						<button className="button admin-btn" onClick={handleAdminDelete}>
							スタンプ削除
						</button>
					</div>
				)}
			</div>

			<style jsx global>{`
				body { font-family: "Segoe UI", "Arial", sans-serif; text-align: center; background: #fff; color: #a97b2c; padding-bottom: 30px; }
				header { background: linear-gradient(120deg, #fffbe7 60%, #d2ae5e 100%); border-bottom: 3px solid #a97b2c22; padding-top: 16px; padding-bottom: 8px; margin-bottom: 16px; position: relative; }
				.logo { width: 110px; height: auto; display: block; margin: 0 auto 8px auto; filter: drop-shadow(0 2px 8px #cdbb6c55); }
				.main-title { font-size: 2.1em; font-weight: 900; letter-spacing: .07em; margin: 0 0 6px 0; color: #a97b2c; text-shadow: 1px 2px 10px #fff8, 0 0 6px #ffd700; font-family: 'Impact', 'Arial Black', sans-serif; }
				.subtitle { font-size: 1.28em; font-weight: bold; color: #b88c00; margin-bottom: 0; letter-spacing: .12em; font-family: 'Segoe UI', 'Arial Black', sans-serif; text-shadow: 0 1px 6px #fff8; }
				@media (max-width: 600px) { .logo { width: 80px; } .main-title { font-size: 1.35em; } .subtitle { font-size: 1em; } }
				.progress-summary { margin: 16px 0; font-size: 1.1em; color: #333; }
				.stamp-count, .next-prize-info { margin: 4px 0; }
				.count-large { font-size: 1.4em; font-weight: bold; color: #a97b2c; }
				.prize-progress-bar { display: flex; justify-content: center; gap: 12px; margin: 16px 0; padding: 0 10px; max-width: 400px; margin-left: auto; margin-right: auto; }
				.prize-progress { flex: 1; background: #f8f9fa; border: 2px solid #e9ecef; border-radius: 9px; padding: 8px 10px; color: #adb5bd; font-weight: bold; font-size: 1em; text-align: center; box-shadow: 0 1px 4px #0001; transition: all 0.3s ease; }
				.prize-done { background: #fffbe7; border-color: #ffd700; color: #b88c00; transform: scale(1.05); box-shadow: 0 2px 10px #ffd70044; }
				.prize-num { font-size: 1.2em; font-weight: bold; display: block; }
				.prize-label { font-size: 0.8em; display: block; margin-top: 2px; }
				.stamp-container { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; max-width: 380px; margin: 0 auto 30px; padding: 0 10px; }
				.stamp { width: 54px; height: 54px; border-radius: 50%; border: 2px solid #a97b2c; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; background-color: #fff; position: relative; box-shadow: 0 2px 8px #0001; transition: background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s; }
				.stamped { background-image: url('/stamp.png'); background-size: cover; background-position: center; color: white; border: 2.5px solid #4caf50; box-shadow: 0 2px 12px #4caf5077, 0 0 0 3px #ffd70044; animation: pop .36s cubic-bezier(.22,1,.36,1.06); }
				@keyframes pop { 0% { transform: scale(0.2);} 70% {transform: scale(1.25);} 100% {transform: scale(1);} }
				.special-stamp { color: #ffd700 !important; border-color: #ffd700 !important; font-size: 14px !important; font-family: 'Impact', 'Arial Black', sans-serif; background: linear-gradient(145deg, #fffbe7 70%, #ffd700 100%); box-shadow: 0 0 15px #ffd70099, 0 0 6px #fffbe7; animation: shine 2s infinite linear alternate; z-index: 2; }
				.special-stamp.stamped { background-image: url('/stamp.png'); background-size: cover; background-position: center; color: transparent !important; text-shadow: none !important; border: 2.5px solid #4caf50 !important; box-shadow: 0 2px 22px #ffd70077, 0 0 0 4px #ffd70066; animation: pop .36s cubic-bezier(.22,1,.36,1.06), shine 2s infinite linear alternate; position: relative; }
				.special-stamp.stamped .special-label { opacity: 0 !important; pointer-events: none; }
				@keyframes shine { 0% { box-shadow: 0 0 10px #ffd70099; } 100% { box-shadow: 0 0 22px #ffd700, 0 0 8px #fffbe7; } }
				.special-label { display: block; font-size: 0.6em; font-weight: bold; color: #b88c00; margin-top: 2px; text-shadow: 1px 1px 6px #fff, 0 0 2px #ffd700; letter-spacing: 1px; text-align: center; width: 100%; line-height: 1.1; }
				.history-list { max-width: 600px; margin: 20px auto 20px auto; background: #f9f9ee; border-radius: 10px; box-shadow: 0 2px 10px #ffd70022; padding: 18px 12px; }
				.history-title { font-weight: bold; color: #a97b2c; font-size: 1.15em; margin-bottom: 10px; }
				.history-item { font-size: 1.08em; text-align: left; margin: 6px 0; color: #444; border-bottom: 1px solid #eee; padding-bottom: 3px; }
				.history-item:last-child { border-bottom: none; }
				.admin-controls-wrapper { display: flex; flex-direction: column; justify-content: center; align-items: center; margin-top: 30px; gap: 10px; }
				.admin-toggle-btn { background-color: #f8f9fa; color: #6c757d; border: 1px solid #dee2e6; padding: 8px 16px; font-size: 14px; }
				.admin-controls { margin: 0 auto; padding: 15px; background: #f1f3f5; border-radius: 8px; border: 1px solid #dee2e6; max-width: 300px; text-align: center; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
				.admin-btn { background-color: #6c757d; color: white; padding: 8px 16px; font-size: 14px; border-radius: 5px; }
				.staff-confirm-container { margin: 24px auto 0 auto; max-width: 420px; background: #fffbe7; border: 2px solid #ffd700cc; border-radius: 12px; box-shadow: 0 4px 16px #ffd70022; padding: 28px 20px 22px 20px; color: #a97c2c; font-size: 1.22em; font-weight: bold; text-align: center; z-index: 12; }
				.staff-confirm-container .confirm-label { margin-bottom: 14px; font-size: 1.1em; font-weight: bold; color: #b88c00; letter-spacing: 1px; text-shadow: 0 2px 12px #fffbe7; line-height: 1.6; }
				.staff-confirm-container button { margin-top: 10px; background: #00c300; color: #fff; font-size: 1.1em; border-radius: 8px; border: none; padding: 10px 28px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 12px #c3e6cb88; }
			`}</style>
		</>
	);
}


