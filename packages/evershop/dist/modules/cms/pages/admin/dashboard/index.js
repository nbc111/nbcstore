import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { translate } from '../../../../../lib/locale/translate/translate.js';
export default ((request, response)=>{
    setPageMetaInfo(request, {
        title: translate('Dashboard'),
        description: translate('Admin dashboard overview')
    });
});
