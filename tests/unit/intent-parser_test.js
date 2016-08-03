import moment from 'components/moment';
import IntentParser from 'js/lib/intent-parser';

describe('intent-parser', function() {
  describe('Properly parses expected reminder sentences', function() {
    const fixtures = [
      {
        sentence: 'Remind me to go to the office by 5pm',
        parsed: {
          recipients: ['me'],
          action: 'go to the office',
          confirmation:
            'OK, I\'ll remind you to go to the office at 5 PM today.',
          due: moment({ hour: 17 }).toDate().getTime(),
        },
      },
      {
        sentence: 'Remind John by tomorrow to take out trash',
        parsed: {
          recipients: ['John'],
          action: 'take out trash',
          confirmation:
            'OK, I\'ll remind John to take out trash at 12 PM tomorrow.',
          due: moment({ hour: 12 }).add(1, 'day').toDate().getTime(),
        },
      },
    ];

    fixtures.forEach(({ sentence, parsed }) => {
      it(sentence, function() {
        const intentParser = new IntentParser();
        return intentParser.parse(sentence).then((result) => {
          assert.deepEqual(result, parsed);
        });
      });
    });
  });
});
