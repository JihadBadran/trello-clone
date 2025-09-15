import { Link } from '@tanstack/react-router';
import NxWelcome from './nx-welcome';

export function App() {
  return (
    <div className=''>
      <NxWelcome title="@trello-clone/web" />

      <br />
      <hr />
      <br />
      <div role="navigation">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/boards/:boardId">Boards</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default App;
