using Microsoft.JSInterop;
using System.Threading.Tasks;

namespace car_lister.Services
{
    public interface IFirebaseAuthService
    {
        Task<bool> SignInWithGoogleAsync();
        Task SignOutAsync();
        Task<bool> IsUserAuthenticatedAsync();
    }

    public class FirebaseAuthService : IFirebaseAuthService
    {
        private readonly IJSRuntime _jsRuntime;

        public FirebaseAuthService(IJSRuntime jsRuntime)
        {
            _jsRuntime = jsRuntime;
        }

        public async Task<bool> SignInWithGoogleAsync()
        {
            try
            {
                return await _jsRuntime.InvokeAsync<bool>("firebaseAuth.signInWithGoogle");
            }
            catch
            {
                return false;
            }
        }

        public async Task SignOutAsync()
        {
            await _jsRuntime.InvokeVoidAsync("firebaseAuth.signOut");
        }

        public async Task<bool> IsUserAuthenticatedAsync()
        {
            return await _jsRuntime.InvokeAsync<bool>("firebaseAuth.isUserAuthenticated");
        }
    }
} 