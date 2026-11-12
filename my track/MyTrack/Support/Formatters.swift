import Foundation

enum Formatters {

    /// Distance lisible : « 450 m », « 2,3 km ».
    static func distance(_ meters: Double) -> String {
        if meters < 1000 {
            return "\(Int(meters.rounded())) m"
        }
        let km = meters / 1000
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = km < 10 ? 1 : 0
        let value = formatter.string(from: NSNumber(value: km)) ?? String(format: "%.1f", km)
        return "\(value) km"
    }

    static func date(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .short
        f.locale = Locale.current
        return f.string(from: date)
    }

    static func shortDate(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateStyle = .short
        f.timeStyle = .none
        f.locale = Locale.current
        return f.string(from: date)
    }

    static func coordinate(latitude: Double, longitude: Double) -> String {
        String(format: "%.5f, %.5f", latitude, longitude)
    }
}
