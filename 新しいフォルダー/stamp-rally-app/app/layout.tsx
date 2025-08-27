import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ja">
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>AUTUMN LEAGUE Stamp Rally</title>
				<script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
			</head>
			<body>
				{children}
			</body>
		</html>
	);
}



