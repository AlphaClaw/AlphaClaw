import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import {
	createContext,
	useCallback,
	useContext,
	useRef,
	useState,
} from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/turnstile";

interface TurnstileContextValue {
	getToken: () => Promise<string>;
}

const TurnstileContext = createContext<TurnstileContextValue>({
	getToken: () => Promise.reject(new Error("TurnstileProvider not mounted")),
});

export function useTurnstile() {
	return useContext(TurnstileContext);
}

export function TurnstileProvider({ children }: { children: React.ReactNode }) {
	const [ready, setReady] = useState(false);
	const ref = useRef<TurnstileInstance>(null);
	const tokenRef = useRef<string | null>(null);
	const resolversRef = useRef<Array<(token: string) => void>>([]);

	function handleSuccess(token: string) {
		tokenRef.current = token;
		for (const resolve of resolversRef.current) {
			resolve(token);
		}
		resolversRef.current = [];
	}

	function handleExpire() {
		tokenRef.current = null;
	}

	const getToken = useCallback((): Promise<string> => {
		if (tokenRef.current) {
			const token = tokenRef.current;
			tokenRef.current = null;
			ref.current?.reset();
			return Promise.resolve(token);
		}

		return new Promise<string>((resolve) => {
			resolversRef.current.push(resolve);
			if (ready) {
				ref.current?.execute();
			}
		});
	}, [ready]);

	return (
		<TurnstileContext value={{ getToken }}>
			{children}
			<Turnstile
				ref={ref}
				siteKey={TURNSTILE_SITE_KEY}
				onSuccess={handleSuccess}
				onError={() => {
					tokenRef.current = null;
				}}
				onExpire={handleExpire}
				onWidgetLoad={() => setReady(true)}
				options={{ size: "invisible", execution: "execute" }}
			/>
		</TurnstileContext>
	);
}
