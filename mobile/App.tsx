import React, { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "./src/context/AppContext";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { PairScreen } from "./src/screens/PairScreen";
import { ScanQrScreen } from "./src/screens/ScanQrScreen";
import { PianoScreen } from "./src/screens/PianoScreen";
import { FlashScreen } from "./src/screens/FlashScreen";
import { QuizScreen } from "./src/screens/QuizScreen";
import { StudioScreen } from "./src/screens/StudioScreen";
import { parsePairUrl } from "./src/lib/api";

type Route =
  | { name: "home" }
  | { name: "settings" }
  | { name: "pair"; initialUrl?: string }
  | { name: "scan" }
  | { name: "piano"; id: string }
  | { name: "flash"; id: string }
  | { name: "quiz"; id: string }
  | { name: "studio"; id: string; sectionIndex: number; nodeId?: string };

function routeFromUrl(url: string | null): Route | null {
  if (!url) return null;
  const base = parsePairUrl(url);
  if (base) return { name: "pair", initialUrl: base };
  // studify://pair?baseUrl=...
  if (url.includes("pair") || url.includes("baseUrl")) {
    const parsed = parsePairUrl(url);
    if (parsed) return { name: "pair", initialUrl: parsed };
  }
  return null;
}

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "home" });

  const handleIncoming = useCallback((url: string | null) => {
    const r = routeFromUrl(url);
    if (r) setRoute(r);
  }, []);

  useEffect(() => {
    void Linking.getInitialURL().then(handleIncoming);
    const sub = Linking.addEventListener("url", ({ url }) => {
      handleIncoming(url);
    });
    return () => sub.remove();
  }, [handleIncoming]);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        {route.name === "home" && (
          <HomeScreen
            onOpenPiano={(id) => setRoute({ name: "piano", id })}
            onOpenSettings={() => setRoute({ name: "settings" })}
            onOpenPair={() => setRoute({ name: "pair" })}
          />
        )}
        {route.name === "settings" && (
          <SettingsScreen
            onBack={() => setRoute({ name: "home" })}
            onPair={() => setRoute({ name: "pair" })}
          />
        )}
        {route.name === "pair" && (
          <PairScreen
            initialUrl={route.initialUrl}
            onBack={() => setRoute({ name: "home" })}
            onDone={() => setRoute({ name: "home" })}
            onScanQr={() => setRoute({ name: "scan" })}
          />
        )}
        {route.name === "scan" && (
          <ScanQrScreen
            onBack={() => setRoute({ name: "pair" })}
            onScanned={(url) =>
              setRoute({ name: "pair", initialUrl: url })
            }
          />
        )}
        {route.name === "piano" && (
          <PianoScreen
            pianoId={route.id}
            onBack={() => setRoute({ name: "home" })}
            onFlash={() => setRoute({ name: "flash", id: route.id })}
            onQuiz={() => setRoute({ name: "quiz", id: route.id })}
            onStudio={(sectionIndex, nodeId) =>
              setRoute({
                name: "studio",
                id: route.id,
                sectionIndex,
                nodeId,
              })
            }
          />
        )}
        {route.name === "flash" && (
          <FlashScreen
            pianoId={route.id}
            onBack={() => setRoute({ name: "piano", id: route.id })}
          />
        )}
        {route.name === "quiz" && (
          <QuizScreen
            pianoId={route.id}
            onBack={() => setRoute({ name: "piano", id: route.id })}
          />
        )}
        {route.name === "studio" && (
          <StudioScreen
            pianoId={route.id}
            sectionIndex={route.sectionIndex}
            nodeId={route.nodeId}
            onBack={() => setRoute({ name: "piano", id: route.id })}
          />
        )}
      </AppProvider>
    </SafeAreaProvider>
  );
}
