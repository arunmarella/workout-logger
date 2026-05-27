import SwiftUI

struct ProgressRing: View {
    var progress: Double // 0.0 to 1.0
    var color: Color = .blue
    
    var body: some View {
        ZStack {
            Circle()
                .stroke(lineWidth: 10)
                .opacity(0.1)
                .foregroundColor(color)
            
            Circle()
                .trim(from: 0.0, to: CGFloat(min(progress, 1.0)))
                .stroke(style: StrokeStyle(lineWidth: 10, lineCap: .round, lineJoin: .round))
                .foregroundColor(color)
                .rotationEffect(Angle(degrees: 270.0))
                .animation(.linear, value: progress)
            
            Text(String(format: "%.0f%%", progress * 100))
                .font(.system(.title3, design: .rounded))
                .fontWeight(.bold)
        }
    }
}

struct ProgressRing_Previews: PreviewProvider {
    static var previews: some View {
        ProgressRing(progress: 0.65)
            .frame(width: 100, height: 100)
    }
}
