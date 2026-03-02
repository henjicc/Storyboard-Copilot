import { v4 as uuidv4 } from 'uuid';

import type { IdGenerator } from '../application/ports';

export const uuidGenerator: IdGenerator = {
  next: () => uuidv4(),
};
