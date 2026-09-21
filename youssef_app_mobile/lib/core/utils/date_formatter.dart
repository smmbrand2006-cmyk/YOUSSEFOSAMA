import 'package:intl/intl.dart';

class DateFormatter {
  DateFormatter._();

  static String formatChatTime(dynamic timestamp) {
    if (timestamp == null) return "";
    DateTime date;
    if (timestamp is int) {
      date = DateTime.fromMillisecondsSinceEpoch(timestamp);
    } else if (timestamp is DateTime) {
      date = timestamp;
    } else {
      try {
        // Firestore Timestamp object has toDate()
        date = (timestamp as dynamic).toDate();
      } catch (_) {
        return "";
      }
    }

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final messageDay = DateTime(date.year, date.month, date.day);

    if (messageDay == today) {
      return DateFormat('h:mm a').format(date);
    } else if (today.difference(messageDay).inDays == 1) {
      return "أمس";
    } else if (today.difference(messageDay).inDays < 7) {
      final days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      return days[date.weekday % 7];
    } else {
      return DateFormat('dd/MM/yyyy').format(date);
    }
  }

  static String formatMessageTime(dynamic timestamp) {
    if (timestamp == null) return "";
    DateTime date;
    if (timestamp is int) {
      date = DateTime.fromMillisecondsSinceEpoch(timestamp);
    } else if (timestamp is DateTime) {
      date = timestamp;
    } else {
      try {
        date = (timestamp as dynamic).toDate();
      } catch (_) {
        return "";
      }
    }
    return DateFormat('h:mm a').format(date);
  }
}
