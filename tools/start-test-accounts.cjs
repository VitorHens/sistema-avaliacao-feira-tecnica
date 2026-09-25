if (process.env.NODE_ENV === 'production') {
    throw new Error('As contas de teste não podem ser ativadas em produção.');
}
process.env.ENABLE_TEST_PROFESSOR = 'true';
process.env.PORT ||= '3000';
require('../index.js');
