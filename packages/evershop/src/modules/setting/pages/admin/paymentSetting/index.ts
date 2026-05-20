import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { translate } from '../../../../../lib/locale/translate/translate.js';

export default (request) => {
  setPageMetaInfo(request, {
    title: translate('Payment Setting'),
    description: translate('Payment Setting')
  });
};
