import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "./src/context/AppContext";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { PairScreen } from "./src/screens/PairScreen";
import { PianoScreen } from "./src/screens/PianoScreen";
import { FlashScreen } from "./src/screens/FlashScreen";
import { QuizScreen } from "./src/screens/QuizScreen";
import { StudioScreen } from "./src/screens/StudioScreen";

type Route =
  | { name: "home" }
  | { name: "settings" }
  | { name: "pair" }
  | { name: "piano"; id: string }
  | { name: "flash"; id: string }
  | { name: "quiz"; id: string }
  | { name: "studio"; id: string; sectionIndex: number; nodeId?: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "home" });

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
            onBack={() => setRoute({ name: "home" })}
            onDone={() => setRoute({ name: "home" })}
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
