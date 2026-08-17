import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './storage';
import { Alert } from 'react-native';

const ALL_KEYS = Object.values(STORAGE_KEYS);

export interface BackupData {
  version: number;
  exportedAt: string;
  data: Record<string, string>;
}

export async function exportBackup(): Promise<boolean> {
  try {
    // Collect all stored data
    const pairs = await AsyncStorage.multiGet(ALL_KEYS);
    const data: Record<string, string> = {};
    for (const [key, value] of pairs) {
      if (value !== null) data[key] = value;
    }

    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    };

    const json = JSON.stringify(backup, null, 2);
    const filename = `imtelak-backup-${new Date().toISOString().split('T')[0]}.json`;
    const file = new File(Paths.cache, filename);
    file.write(json);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('غير متاح', 'المشاركة غير متاحة على هذا الجهاز');
      return false;
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'حفظ نسخة احتياطية',
    });
    return true;
  } catch (e) {
    console.error('Backup export error:', e);
    Alert.alert('خطأ', 'فشل في تصدير البيانات');
    return false;
  }
}

export async function importBackup(): Promise<boolean> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return false;

    const fileUri = result.assets[0].uri;
    const json = await new File(fileUri).text();

    const backup: BackupData = JSON.parse(json);

    if (!backup.version || !backup.data) {
      Alert.alert('خطأ', 'الملف غير صالح أو تالف');
      return false;
    }

    // Restore all keys
    const pairs: [string, string][] = Object.entries(backup.data).map(
      ([k, v]) => [k, v]
    );
    await AsyncStorage.multiSet(pairs);

    Alert.alert(
      'تم الاستعادة',
      `تم استعادة البيانات بنجاح من نسخة ${backup.exportedAt.split('T')[0]}.\nأعد تشغيل التطبيق لرؤية التغييرات.`
    );
    return true;
  } catch (e) {
    console.error('Backup import error:', e);
    Alert.alert('خطأ', 'فشل في استيراد الملف. تأكد أنه ملف نسخة احتياطية صحيح.');
    return false;
  }
}
