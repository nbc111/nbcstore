import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { translate } from '../../../../../lib/locale/translate/translate.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
export default ((request, response)=>{
    setPageMetaInfo(request, {
        title: translate('Products'),
        description: translate('Products')
    });
    setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request.originalUrl));
});
