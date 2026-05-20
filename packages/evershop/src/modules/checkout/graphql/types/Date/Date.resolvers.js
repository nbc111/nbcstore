import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn.js';
import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Date: {
    value: (raw) => raw,
    text: (raw) => {
      const language = getConfig('shop.language', 'en');
      if (language === 'zh') {
        return dayjs(raw).locale('zh-cn').format('YYYY年M月D日');
      }
      return dayjs(raw).format('MMM D, YYYY');
    }
  }
};
