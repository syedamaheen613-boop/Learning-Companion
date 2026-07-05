import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Router as WouterRouter, Redirect } from "wouter";
import { Layout } from "./components/layout";
import { Dashboard } from "./pages/dashboard";
import { Challenge } from "./pages/challenge";
import { StudyPlan } from "./pages/study-plan";
import { Badges } from "./pages/badges";
import { Leaderboard } from "./pages/leaderboard";
import { VoiceChat } from "./pages/voice-chat";
import { DemoStage } from "./pages/demo";
import { ConceptMap } from "./pages/graph";
import { LogMistake } from "./pages/log";
import { Login } from "./pages/login";
import { UserProvider, useUser } from "./lib/userContext";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  const { user } = useUser();

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/challenge" component={Challenge} />
        <Route path="/study-plan" component={StudyPlan} />
        <Route path="/badges" component={Badges} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/voice-chat" component={VoiceChat} />
        <Route path="/demo" component={DemoStage} />
        <Route path="/graph" component={ConceptMap} />
        <Route path="/log" component={LogMistake} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
