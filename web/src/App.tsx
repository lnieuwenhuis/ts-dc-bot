import { Router, Route } from '@solidjs/router';
import { lazy } from 'solid-js';
import Layout from './components/Layout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Guilds = lazy(() => import('./pages/Guilds'));
const GuildDetail = lazy(() => import('./pages/GuildDetail'));
const Users = lazy(() => import('./pages/Users'));
const UserDetail = lazy(() => import('./pages/UserDetail'));

export default function App() {
  return (
    <Router>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <Layout><Dashboard /></Layout>} />
      <Route path="/guilds" component={() => <Layout><Guilds /></Layout>} />
      <Route path="/guilds/:id" component={() => <Layout><GuildDetail /></Layout>} />
      <Route path="/users" component={() => <Layout><Users /></Layout>} />
      <Route path="/users/:id" component={() => <Layout><UserDetail /></Layout>} />
    </Router>
  );
}
