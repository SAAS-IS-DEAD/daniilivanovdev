import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../../artifacts/schema.graphql',
  documents: ['src/api/*.graphql'],
  generates: {
    'src/api/generated/sdk.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-graphql-request'],
      config: {
        strictScalars: true,
        scalars: { Date: 'string', DateTime: 'string' },
        useTypeImports: true,
        documentMode: 'documentNode',
      },
    },
  },
};
export default config;
