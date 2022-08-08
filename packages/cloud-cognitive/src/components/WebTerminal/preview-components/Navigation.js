import React from 'react';
import {
  Header,
  HeaderName,
  HeaderGlobalAction,
  HeaderGlobalBar,
} from '@carbon/react';
import { Terminal, Search, User } from '@carbon/icons-react';

import { useWebTerminal } from '../hooks';

const Navigation = () => {
  const { openWebTerminal } = useWebTerminal();

  return (
    <Header aria-label="IBM Platform Name">
      <HeaderName href="#" prefix="IBM">
        [Platform]
      </HeaderName>
      <HeaderGlobalBar>
        <HeaderGlobalAction aria-label="Web terminal" onClick={openWebTerminal}>
          <Terminal size={20} />
        </HeaderGlobalAction>
        <HeaderGlobalAction aria-label="Search" onClick={() => {}}>
          <Search size={20} />
        </HeaderGlobalAction>
        <HeaderGlobalAction aria-label="User" onClick={() => {}}>
          <User size={20} />
        </HeaderGlobalAction>
      </HeaderGlobalBar>
    </Header>
  );
};

export default Navigation;
