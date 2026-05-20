import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { translate } from '../../../../../lib/locale/translate/translate.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request: EvershopRequest, response) => {
  setPageMetaInfo(request, {
    title: translate('Collections'),
    description: translate('Collections')
  });
  setContextValue(
    request,
    'filtersFromUrl',
    buildFilterFromUrl(request.originalUrl)
  );
};
