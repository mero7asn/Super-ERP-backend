import { Navigate } from 'react-router-dom';

// Teams is now split into two pages:
//   /teams/my  -> MyTeamPage  (teams the current user belongs to)
//   /teams/all -> AllTeamsPage (full org hierarchy)
// /teams simply redirects to "My Team".
const TeamsPage = () => {
  return <Navigate to="/teams/my" replace />;
};

export default TeamsPage;
