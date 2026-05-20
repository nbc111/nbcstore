import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { translate } from '../../../../../lib/locale/translate/translate.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { setPageMetaInfo } from '../../../services/pageMetaInfo.js';
export default ((request, response)=>{
    setPageMetaInfo(request, {
        title: translate('Widgets'),
        description: translate('Widgets')
    });
    setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request.originalUrl));
});
